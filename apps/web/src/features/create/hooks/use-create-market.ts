"use client";

import {
  deploymentByChainId,
  erc20Abi,
  factoryAddress,
  kizashiMarketFactoryAbi,
  usdcAddressByChainId,
} from "@kizashi/contracts";
import { MARKET_METADATA_VERSION, type MarketMetadata } from "@kizashi/schemas/market";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type Address, decodeEventLog, type Hash, parseUnits, zeroAddress } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { appChain } from "@/lib/wagmi";
import type { PreparedImage } from "../lib/image";
import { type CreateFormValues, gridOf, splitTags } from "../types";

/** KizashiResolver.DISPUTE_WINDOW. */
const DISPUTE_WINDOW_SEC = 30 * 60;
const KIND = { binary: 0, curve: 1 } as const;
const RESOLUTION = { manual: 1, "uniswap-twap": 2 } as const;

export type CreateStep = "image" | "metadata" | "approve" | "create" | "listing";

export type CreateProgress =
  | { phase: "idle" }
  | { phase: "running"; step: CreateStep; txHash?: Hash }
  | { phase: "failed"; step: CreateStep; message: string; marketId?: bigint; metadataCid?: string }
  | {
      phase: "done";
      marketId: bigint;
      createTx: Hash;
      metadataCid: string;
      listing: { entityKey?: string; error?: string };
    };

export type CreateMarket = {
  ready: boolean;
  reason?: string;
  progress: CreateProgress;
  create: (values: CreateFormValues, image: PreparedImage | undefined) => Promise<void>;
  retryListing: () => Promise<void>;
};

async function postForm(form: FormData): Promise<Record<string, unknown>> {
  const res = await fetch("/api/ipfs", { method: "POST", body: form });
  const body = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
  } & Record<string, unknown>;
  if (!res.ok) throw new Error(body.error?.message ?? `Upload failed (${res.status})`);
  return body;
}

async function publishListing(marketId: bigint, metadataCid: string) {
  const res = await fetch("/api/markets/listing", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ marketId: marketId.toString(), metadataCid }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    entityKey?: string;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(body.error?.message ?? `Listing failed (${res.status})`);
  return body.entityKey;
}

export function useCreateMarket(): CreateMarket {
  const chainId = appChain.id;
  const { address, chainId: walletChain } = useAccount();
  const publicClient = usePublicClient({ chainId });
  const { data: wallet } = useWalletClient({ chainId });
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<CreateProgress>({ phase: "idle" });

  const factory = factoryAddress(chainId);
  const usdc = usdcAddressByChainId(chainId);
  const deployment = deploymentByChainId(chainId);

  const reason =
    !factory || !usdc
      ? "Markets can't be created on this network."
      : !address
        ? "Connect a wallet to create a market."
        : walletChain !== chainId
          ? `Switch your wallet to ${appChain.name}.`
          : !wallet || !publicClient
            ? "Waiting for the wallet…"
            : undefined;

  async function create(values: CreateFormValues, image: PreparedImage | undefined) {
    if (reason || !factory || !usdc || !address || !wallet || !publicClient) return;
    let step: CreateStep = "image";
    let metadataCid: string | undefined;
    let marketId: bigint | undefined;
    try {
      const grid = gridOf(values);
      if (!grid) throw new Error("The outcome range doesn't divide into equal steps");
      const subsidyUsdc = parseUnits(values.subsidy, 6);
      const closeTimeSec = Math.floor(Date.parse(values.closesAt) / 1000);

      // 1. Image to IPFS
      let imageMeta: MarketMetadata["image"];
      if (image) {
        setProgress({ phase: "running", step });
        const form = new FormData();
        form.append("kind", "image");
        form.append("file", image.blob, "image.webp");
        const res = await postForm(form);
        imageMeta = {
          cid: String(res.cid),
          mime: String(res.mime) as NonNullable<MarketMetadata["image"]>["mime"],
          width: image.width,
          height: image.height,
        };
      }

      // 2. Metadata to IPFS; its keccak256 becomes the on-chain rulesRef
      step = "metadata";
      setProgress({ phase: "running", step });
      const metadata: MarketMetadata = {
        v: MARKET_METADATA_VERSION,
        question: values.question,
        description: values.description,
        category: values.category,
        tags: splitTags(values.tags),
        ...(imageMeta ? { image: imageMeta } : {}),
        outcomes:
          values.kind === "binary"
            ? { kind: "binary", yes: values.yesLabel, no: values.noLabel }
            : {
                kind: "curve",
                unit: values.unit,
                low: values.low,
                high: values.high,
                buckets: Number(values.buckets),
                precision: grid.precision,
              },
        closeTimeSec,
        resolution: {
          source: values.source,
          sourceName: values.sourceName,
          ...(values.sourceUrl ? { sourceUrl: values.sourceUrl } : {}),
          criteria: values.criteria,
          ...(values.edgeCases ? { edgeCases: values.edgeCases } : {}),
          disputeWindowSec: values.source === "manual" ? DISPUTE_WINDOW_SEC : 0,
        },
        subsidyUsdc: subsidyUsdc.toString(),
        creator: address,
        createdAtSec: Math.floor(Date.now() / 1000),
      };
      const form = new FormData();
      form.append("kind", "metadata");
      form.append("metadata", JSON.stringify(metadata));
      const pinned = await postForm(form);
      metadataCid = String(pinned.cid);
      const rulesRef = pinned.rulesRef as `0x${string}`;

      // 3. USDC approval for the subsidy
      step = "approve";
      setProgress({ phase: "running", step });
      const allowance = await publicClient.readContract({
        address: usdc,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, factory],
      });
      if (allowance < subsidyUsdc) {
        const hash = await wallet.writeContract({
          address: usdc,
          abi: erc20Abi,
          functionName: "approve",
          args: [factory, subsidyUsdc],
          chain: appChain,
          account: address,
        });
        setProgress({ phase: "running", step, txHash: hash });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("USDC approval reverted");
      }

      // 4. createMarket on Arc
      step = "create";
      setProgress({ phase: "running", step });
      const twap = deployment?.twap;
      if (values.source === "uniswap-twap" && !twap)
        throw new Error("No Uniswap v4 oracle pool is configured on this network");
      const zeroKey = {
        currency0: zeroAddress,
        currency1: zeroAddress,
        fee: 0,
        tickSpacing: 0,
        hooks: zeroAddress,
      } as const;
      const priceSource =
        values.source === "uniswap-twap" && twap
          ? {
              key: twap.key,
              baseIsToken0: twap.baseIsToken0,
              baseDecimals: twap.baseDecimals,
              quoteDecimals: twap.quoteDecimals,
              gridDecimals: grid.precision,
              window: twap.window,
              minObservations: twap.minObservations,
              minLiquidity: twap.minLiquidity,
            }
          : {
              key: zeroKey,
              baseIsToken0: false,
              baseDecimals: 0,
              quoteDecimals: 0,
              gridDecimals: 0,
              window: 0,
              minObservations: 0,
              minLiquidity: 0n,
            };
      const args = [
        {
          config: { n: grid.n, lo: grid.lo, w: grid.w, collateral: usdc as Address },
          subsidyUsdc,
          closeTime: BigInt(closeTimeSec),
          kind: KIND[values.kind],
          resolution: RESOLUTION[values.source],
          rulesRef,
          priceSource,
        },
      ] as const;
      await publicClient.simulateContract({
        address: factory,
        abi: kizashiMarketFactoryAbi,
        functionName: "createMarket",
        args,
        account: address,
      });
      const createTx = await wallet.writeContract({
        address: factory,
        abi: kizashiMarketFactoryAbi,
        functionName: "createMarket",
        args,
        chain: appChain,
        account: address,
      });
      setProgress({ phase: "running", step, txHash: createTx });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: createTx });
      if (receipt.status !== "success") throw new Error("createMarket reverted");
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== factory.toLowerCase()) continue;
        try {
          const event = decodeEventLog({ abi: kizashiMarketFactoryAbi, ...log });
          if (event.eventName === "MarketCreated") marketId = event.args.marketId;
        } catch {}
      }
      if (marketId === undefined) throw new Error("MarketCreated event not found in the receipt");

      // 5. Arkiv listing (server, listing wallet); the market already exists if this fails
      step = "listing";
      setProgress({ phase: "running", step, txHash: createTx });
      let listing: { entityKey?: string; error?: string };
      try {
        const entityKey = await publishListing(marketId, metadataCid);
        listing = entityKey ? { entityKey } : {};
      } catch (error) {
        listing = { error: error instanceof Error ? error.message : "Listing failed" };
      }
      setProgress({ phase: "done", marketId, createTx, metadataCid, listing });
      void queryClient.invalidateQueries();
    } catch (error) {
      setProgress({
        phase: "failed",
        step,
        message: readable(error),
        ...(marketId !== undefined ? { marketId } : {}),
        ...(metadataCid ? { metadataCid } : {}),
      });
    }
  }

  async function retryListing() {
    if (progress.phase !== "done") return;
    try {
      const entityKey = await publishListing(progress.marketId, progress.metadataCid);
      setProgress({ ...progress, listing: entityKey ? { entityKey } : {} });
    } catch (error) {
      setProgress({
        ...progress,
        listing: { error: error instanceof Error ? error.message : "Listing failed" },
      });
    }
  }

  return {
    ready: reason === undefined,
    ...(reason ? { reason } : {}),
    progress,
    create,
    retryListing,
  };
}

function readable(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/User rejected|denied/i.test(message)) return "You rejected the request in your wallet.";
  if (/insufficient/i.test(message)) return "Not enough USDC for the initial liquidity and gas.";
  return message.split("\n")[0]?.slice(0, 240) ?? "Something went wrong";
}
