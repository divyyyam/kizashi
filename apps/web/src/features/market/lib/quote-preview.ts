import {
  floorOf,
  freed,
  gaussianShape,
  maxOf,
  maxSizeForBudget,
  minOf,
  mulDown,
  nettedCollateral,
  quoteTrade,
  range,
  step,
  toWad,
  tradeCharge,
  WAD,
} from "@kizashi/core";
import { copy } from "@/content/copy";
import type { BetDraft, LocalQuote, MarketDetail, OwnerPosition } from "../types";
export function parseSpend(value: string): bigint | undefined {
  if (!/^\d+(\.\d{0,6})?$/.test(value)) return;
  const [whole = "", fraction = ""] = value.split(".");
  const amount = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  return amount > 0n ? amount : undefined;
}
export function buildQuote({
  market,
  position,
  draft,
}: {
  market: MarketDetail;
  position: OwnerPosition;
  draft: BetDraft;
}): LocalQuote | undefined {
  const budgetUsdc = parseSpend(draft.spend);
  if (budgetUsdc === undefined) return;
  if (
    position.chainId !== market.chainId ||
    position.marketId !== market.marketId ||
    position.blockHash !== market.blockHash ||
    position.blockNumber !== market.blockNumber
  )
    throw new Error(copy.market.positionUnavailable);
  const unit =
    draft.mode === "expressive"
      ? gaussianShape(market.grid, draft.mean, draft.sigma)
      : draft.direction === "above"
        ? step(market.grid.n, draft.threshold, WAD)
        : range(market.grid.n, 0, draft.threshold, WAD);
  const size = maxSizeForBudget(market.qWad, market.bWad, unit, toWad(budgetUsdc));
  if (size === 0n) return;
  const deltaWad = unit.map((weight) => mulDown(weight, size));
  const quote = quoteTrade(market.qWad, market.bWad, position.positionWad, deltaWad);
  if (quote.chargeUsdc > budgetUsdc) throw new Error(copy.market.quoteError);
  const history = position.history;
  const requirements: LocalQuote["requirements"] =
    history.status === "complete"
      ? {
          status: "ready",
          lockedWad: nettedCollateral([...history.originalTicketsWad, deltaWad]),
          freedChangeWad:
            freed([...history.originalTicketsWad, deltaWad]) - freed(history.originalTicketsWad),
        }
      : history;
  const probabilityWad = unit.reduce(
    (sum, weight, i) => sum + (weight > 0n ? (market.pricesWad[i] ?? 0n) : 0n),
    0n,
  );
  return {
    ...quote,
    chainId: market.chainId,
    marketId: market.marketId,
    owner: position.owner,
    blockNumber: market.blockNumber,
    blockHash: market.blockHash,
    deltaWad,
    budgetUsdc,
    rawCostWad: tradeCharge(market.qWad, deltaWad, market.bWad),
    maxPayoutWad: maxOf(deltaWad),
    minPayoutWad: minOf(deltaWad),
    probabilityWad,
    currentFloorWad: floorOf(position.positionWad),
    floorAfterWad: floorOf(quote.positionAfter),
    requirements,
  };
}
