import type { Address } from "viem";
import type { History } from "@/features/market";
import type { MarketSummary } from "@/features/markets";

export type PortfolioPosition = Pick<
  MarketSummary,
  "chainId" | "marketId" | "question" | "kind" | "grid" | "unit" | "precision" | "status"
> & {
  owner: `0x${string}`;
  poolAddress?: Address | undefined;
  pnlUsdc?: bigint | undefined;
  positionWad: readonly bigint[];
  history: History;
  lifecycle: "active" | "redeemed";
  blockNumber: bigint;
  blockHash: `0x${string}`;
  winningBucket?: number | undefined;
  finalized?:
    | {
        bucket: number;
        path: number;
        transactionHash: `0x${string}`;
      }
    | undefined;
  canRedeem?: boolean | undefined;
};
