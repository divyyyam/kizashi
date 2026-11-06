import { createArkivReader, type MarketListing, openMarkets } from "@kizashi/arkiv";
import {
  DEPLOYMENT_5042002,
  factoryAddress,
  kizashiMarketFactoryAbi,
  kizashiPoolAbi,
  resolverAddress,
} from "@kizashi/contracts";
import type { PublicClient } from "viem";
import { getAddress, isAddress, parseAbiItem, zeroAddress } from "viem";
import type { MarketKind, MarketStatus } from "@/features/markets";
import type { MarketDetail } from "../types";

export async function fetchMarketDetail(
  client: PublicClient,
  marketId: string,
  chainId: number,
  arkivWriter?: string,
): Promise<MarketDetail | "not_found" | "unsupported"> {
  const factory = factoryAddress(chainId);
  if (!factory) return "unsupported";

  const idBn = BigInt(marketId);
  const pool = await client.readContract({
    address: factory,
    abi: kizashiMarketFactoryAbi,
    functionName: "poolOf",
    args: [idBn],
  });
  if (!pool || pool === zeroAddress) return "not_found";

  const reverseId = await client.readContract({
    address: factory,
    abi: kizashiMarketFactoryAbi,
    functionName: "marketOf",
    args: [pool],
  });
  if (reverseId !== idBn) return "not_found";

  const [cfg, state, closeTime, b, q, prices, block] = await Promise.all([
    client.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "config" }),
    client.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "state" }),
    client.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "closeTime" }),
    client.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "b" }),
    client.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "q" }),
    client.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "prices" }),
    client.getBlock({ blockTag: "latest" }),
  ]);

  if (state === 0) return "not_found";

  let winningBucket: number | undefined;
  let finalized: MarketDetail["finalized"];
  if (state === 3) {
    const wb = await client.readContract({
      address: pool,
      abi: kizashiPoolAbi,
      functionName: "winningBucket",
    });
    winningBucket = Number(wb);

    const resolver = resolverAddress(chainId);
    if (resolver) {
      try {
        const event = parseAbiItem(
          "event Finalized(uint256 indexed marketId, uint256 bucket, uint8 path)",
        );
        const logs = await client.getLogs({
          address: resolver,
          event,
          args: { marketId: idBn },
          fromBlock: DEPLOYMENT_5042002.resolver.block,
        });
        if (logs.length > 0 && logs[0]) {
          finalized = {
            bucket: Number(logs[0].args.bucket),
            path: Number(logs[0].args.path),
            transactionHash: logs[0].transactionHash,
          };
        }
      } catch {
        // Continue even if getLogs is rate limited
      }
    }
  }

  let arkivListing: MarketListing | undefined;
  if (arkivWriter && isAddress(arkivWriter)) {
    try {
      const reader = createArkivReader({ rpcUrl: "/api/arkiv" });
      const page = await openMarkets(reader, {
        owner: getAddress(arkivWriter),
        arcChainId: chainId,
      });
      const found = page.items.find((item) => item.marketId === marketId);
      if (found && found.arcAddress.toLowerCase() === pool.toLowerCase()) {
        arkivListing = found;
      }
    } catch {
      // Arkiv unavailable
    }
  }

  const deployed = DEPLOYMENT_5042002.markets[marketId];
  const kind: MarketKind = arkivListing
    ? arkivListing.kind === "curve"
      ? "expressive"
      : "binary"
    : deployed
      ? deployed.kind === "curve"
        ? "expressive"
        : "binary"
      : cfg.n === 2n
        ? "binary"
        : "expressive";

  const status: MarketStatus = state === 1 ? "open" : state === 2 ? "closed" : "resolved";

  return {
    chainId,
    marketId,
    poolAddress: pool,
    question: arkivListing?.payload.title ?? `Market #${marketId}`,
    unit: arkivListing?.payload.grid.unit ?? "",
    precision: arkivListing?.payload.grid.gridDecimals ?? 0,
    kind,
    grid: { n: Number(cfg.n), lo: cfg.lo, w: cfg.w },
    bWad: b,
    qWad: q,
    pricesWad: prices,
    closeTimeSec: Number(closeTime),
    status,
    winningBucket,
    finalized,
    blockNumber: block.number,
    blockHash: block.hash,
  };
}
