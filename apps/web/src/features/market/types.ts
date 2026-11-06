import type { TradeQuote } from "@kizashi/core";
import type { MarketSummary } from "@/features/markets";
export type BlockIdentity = { blockNumber: bigint; blockHash: `0x${string}` };
export type History =
  | { status: "complete"; originalTicketsWad: readonly (readonly bigint[])[] }
  | { status: "unavailable"; reason: string };
export type MarketDetail = MarketSummary &
  BlockIdentity & {
    bWad: bigint;
    qWad: readonly bigint[];
    winningBucket?: number | undefined;
    finalized?:
      | {
          bucket: number;
          path: number;
          transactionHash: `0x${string}`;
        }
      | undefined;
  };
export type OwnerPosition = BlockIdentity & {
  chainId: number;
  marketId: string;
  owner: `0x${string}`;
  positionWad: readonly bigint[];
  history: History;
};
export type BetDraft = {
  mode: "simple" | "expressive";
  direction: "above" | "below";
  threshold: number;
  mean: bigint;
  sigma: bigint;
  spend: string;
};
export type LocalQuote = TradeQuote & {
  chainId: number;
  marketId: string;
  owner: `0x${string}`;
  blockNumber: bigint;
  blockHash: `0x${string}`;
  deltaWad: readonly bigint[];
  budgetUsdc: bigint;
  rawCostWad: bigint;
  maxPayoutWad: bigint;
  minPayoutWad: bigint;
  probabilityWad: bigint;
  currentFloorWad: bigint;
  floorAfterWad: bigint;
  requirements:
    | { status: "ready"; lockedWad: bigint; freedChangeWad: bigint }
    | { status: "unavailable"; reason: string };
};
