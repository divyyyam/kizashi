import { createArkivReader, type MarketListing, openMarkets } from "@kizashi/arkiv";
import {
  DEPLOYMENT_5042002,
  factoryAddress,
  kizashiMarketFactoryAbi,
  kizashiPoolAbi,
} from "@kizashi/contracts";
import type { Address, PublicClient } from "viem";
import { getAddress, isAddress, zeroAddress } from "viem";
import type { MarketKind, MarketStatus, MarketSummary } from "../types";

export type RawPoolState = {
  n: number;
  lo: bigint;
  w: bigint;
  state: number;
  closeTimeSec: number;
  bWad: bigint;
  pricesWad: readonly bigint[];
};

async function readPool(client: PublicClient, pool: Address): Promise<RawPoolState | null> {
  try {
    const [cfg, state, closeTime, b, prices] = await Promise.all([
      client.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "config" }),
      client.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "state" }),
      client.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "closeTime" }),
      client.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "b" }),
      client.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "prices" }),
    ]);
    if (state === 0) return null;
    return {
      n: Number(cfg.n),
      lo: cfg.lo,
      w: cfg.w,
      state,
      closeTimeSec: Number(closeTime),
      bWad: b,
      pricesWad: prices,
    };
  } catch {
    return null;
  }
}

async function fetchArkivMap(
  client: PublicClient,
  factory: Address,
  chainId: number,
  writer: string,
): Promise<Map<string, MarketListing>> {
  const map = new Map<string, MarketListing>();
  if (!isAddress(writer)) return map;
  try {
    const reader = createArkivReader({ rpcUrl: "/api/arkiv" });
    const page = await openMarkets(reader, {
      owner: getAddress(writer),
      arcChainId: chainId,
    });
    for (const item of page.items) {
      try {
        const pool = await client.readContract({
          address: factory,
          abi: kizashiMarketFactoryAbi,
          functionName: "poolOf",
          args: [BigInt(item.marketId)],
        });
        if (pool.toLowerCase() === item.arcAddress.toLowerCase()) {
          map.set(item.marketId, item);
        }
      } catch {
        // Drop items that fail cross-check
      }
    }
  } catch {
    // Arkiv reader unavailable, fall back to chain data
  }
  return map;
}

export async function fetchMarkets(
  client: PublicClient,
  chainId: number,
  arkivWriter?: string,
): Promise<MarketSummary[] | null> {
  const factory = factoryAddress(chainId);
  if (!factory) return null;

  const count = await client.readContract({
    address: factory,
    abi: kizashiMarketFactoryAbi,
    functionName: "marketCount",
  });
  if (count === 0n) return [];

  const arkivMap = arkivWriter
    ? await fetchArkivMap(client, factory, chainId, arkivWriter)
    : new Map<string, MarketListing>();

  const results: MarketSummary[] = [];
  for (let id = 1; id <= Number(count); id++) {
    const marketId = String(id);
    const pool = await client.readContract({
      address: factory,
      abi: kizashiMarketFactoryAbi,
      functionName: "poolOf",
      args: [BigInt(id)],
    });
    if (!pool || pool === zeroAddress) continue;

    const reverseId = await client.readContract({
      address: factory,
      abi: kizashiMarketFactoryAbi,
      functionName: "marketOf",
      args: [pool],
    });
    if (reverseId !== BigInt(id)) continue;

    const raw = await readPool(client, pool);
    if (!raw) continue;

    const arkiv = arkivMap.get(marketId);
    const deployed = DEPLOYMENT_5042002.markets[marketId];
    const kind: MarketKind = arkiv
      ? arkiv.kind === "curve"
        ? "expressive"
        : "binary"
      : deployed
        ? deployed.kind === "curve"
          ? "expressive"
          : "binary"
        : raw.n === 2
          ? "binary"
          : "expressive";

    const status: MarketStatus = raw.state === 1 ? "open" : raw.state === 2 ? "closed" : "resolved";

    results.push({
      chainId,
      marketId,
      poolAddress: pool,
      question: arkiv?.payload.title ?? `Market #${marketId}`,
      unit: arkiv?.payload.grid.unit ?? "",
      precision: arkiv?.payload.grid.gridDecimals ?? 0,
      kind,
      grid: { n: raw.n, lo: raw.lo, w: raw.w },
      bWad: raw.bWad,
      pricesWad: raw.pricesWad,
      closeTimeSec: raw.closeTimeSec,
      status,
    });
  }

  return results;
}
