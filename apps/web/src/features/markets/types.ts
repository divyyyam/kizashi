import type { Grid } from "@kizashi/core";

export type MarketKind = "binary" | "expressive";
export type MarketStatus = "open" | "closed" | "resolved";

export type MarketSummary = {
  chainId: number;
  marketId: string;
  poolAddress?: `0x${string}` | undefined;
  question: string;
  unit: string;
  precision: number;
  kind: MarketKind;
  grid: Grid;
  bWad?: bigint | undefined;
  pricesWad: readonly bigint[];
  closeTimeSec: number;
  status: MarketStatus;
};
