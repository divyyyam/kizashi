"use client";

import type { Address } from "viem";
import { copy } from "@/content/copy";
import type { DataFeedback } from "@/lib/data-state";
import { useAllowance } from "./use-allowance";
import { useTradeTransactions } from "./use-trade-transactions";

export type TradeAction =
  | ({ status: "not_ready"; reason: string } & DataFeedback)
  | {
      status: "ready";
      needsApproval: boolean;
      isApproving: boolean;
      isTrading: boolean;
      approve: () => Promise<void>;
      trade: (delta: readonly bigint[], limitUsdc: bigint, deadline?: bigint) => Promise<void>;
      reason?: undefined;
    };

export function useTrade(identity: {
  chainId: number;
  poolAddress?: Address | undefined;
  owner?: Address | undefined;
  chargeUsdc?: bigint | undefined;
}): TradeAction {
  const allowance = useAllowance(identity);
  const transactions = useTradeTransactions(identity);
  if (!identity.poolAddress) return { status: "not_ready", reason: copy.market.tradingNotLive };
  if (!identity.owner) return { status: "not_ready", reason: copy.market.connect };
  if (!transactions.available) return { status: "not_ready", reason: copy.errors.network };
  if (allowance.status !== "ready")
    return {
      ...allowance,
      status: "not_ready",
      reason:
        allowance.status === "loading"
          ? copy.feedback.allowanceLoading
          : allowance.status === "error"
            ? allowance.message
            : copy.feedback.allowanceError,
    };
  return {
    status: "ready",
    ...transactions,
    needsApproval:
      identity.chargeUsdc !== undefined &&
      identity.chargeUsdc > 0n &&
      allowance.data < identity.chargeUsdc,
  };
}
