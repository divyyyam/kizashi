import type { MarketListing } from "@kizashi/arkiv";
import { DEPLOYMENT_5042002 } from "@kizashi/contracts";
import type { Address } from "viem";
import { copy } from "@/content/copy";
import type { MarketKind, MarketSummary } from "@/features/markets";

export type PoolSnapshot = {
  n: number;
  lo: bigint;
  w: bigint;
  state: number;
  closeTimeSec: number;
  bWad: bigint;
  pricesWad: readonly bigint[];
};

export function marketSummary(input: {
  chainId: number;
  marketId: string;
  poolAddress: Address;
  raw: PoolSnapshot;
  listing: MarketListing | undefined;
}): MarketSummary {
  const { chainId, marketId, poolAddress, raw, listing } = input;
  const deployed = DEPLOYMENT_5042002.markets[marketId];
  const kind: MarketKind = listing
    ? listing.kind === "curve"
      ? "expressive"
      : "binary"
    : deployed
      ? deployed.kind === "curve"
        ? "expressive"
        : "binary"
      : raw.n === 2
        ? "binary"
        : "expressive";
  return {
    chainId,
    marketId,
    poolAddress,
    question: listing?.payload.title ?? copy.feedback.marketName(marketId),
    unit: listing?.payload.grid.unit ?? "",
    precision: listing?.payload.grid.gridDecimals ?? 0,
    kind,
    grid: { n: raw.n, lo: raw.lo, w: raw.w },
    bWad: raw.bWad,
    pricesWad: raw.pricesWad,
    closeTimeSec: raw.closeTimeSec,
    status: raw.state === 1 ? "open" : raw.state === 2 ? "closed" : "resolved",
  };
}
