import type {
  CompiledTrade,
  EngineErrorCode,
  planCandidateSchema,
  RuleSet,
  TickContext,
} from "@kizashi/schemas/engine";
import type { z } from "zod";
import { spendTotals } from "./spend";

type Candidate = z.infer<typeof planCandidateSchema>;
const QUOTE_DRIFT_PERCENT = 1n;
const PERCENT_SCALE = 100n;
const abs = (value: bigint) => (value < 0n ? -value : value);

function quoteMatches(trade: CompiledTrade, context: TickContext) {
  const local = BigInt(trade.localChargeWad);
  const chain = BigInt(trade.chainChargeWad);
  return (
    abs(chain - local) * PERCENT_SCALE <= abs(local) * QUOTE_DRIFT_PERCENT &&
    trade.quotedAtBlock === context.fetchedAtBlock
  );
}

function shapeValid(candidate: Candidate, context: TickContext) {
  const market = context.markets.find((item) => item.marketId === candidate.marketId);
  if (!market || candidate.shape.precision !== market.grid.precision) return false;
  const { lo, hi, count } = market.grid;
  const lower = BigInt(lo),
    upper = BigInt(hi),
    width = (upper - lower) / BigInt(count);
  const edge = (value: string) =>
    BigInt(value) > lower && BigInt(value) < upper && (BigInt(value) - lower) % width === 0n;
  const shape = candidate.shape;
  if (shape.kind === "binary") return edge(shape.threshold);
  if (shape.kind === "range")
    return (
      BigInt(shape.from) >= lower &&
      BigInt(shape.to) <= upper &&
      BigInt(shape.from) < BigInt(shape.to) &&
      (BigInt(shape.from) - lower) % width === 0n &&
      (BigInt(shape.to) - lower) % width === 0n
    );
  return (
    BigInt(shape.mean) >= lower &&
    BigInt(shape.mean) <= upper &&
    BigInt(shape.width) * 2n >= width &&
    BigInt(shape.width) * 2n <= upper - lower
  );
}

export function evaluateTrade(input: {
  candidate: Candidate;
  trade: CompiledTrade;
  context: TickContext;
  rules: RuleSet;
}) {
  const { candidate, trade, context, rules } = input;
  const reasons: EngineErrorCode[] = [];
  const market = context.markets.find((item) => item.marketId === candidate.marketId);
  const spend = spendTotals(context.spend, context.nowSec);
  const limit = BigInt(trade.limitUsdc);
  if (!market || !rules.allowedMarketIds.includes(candidate.marketId))
    reasons.push("unknown_market");
  if (market && (market.state !== "open" || market.closeTimeSec <= context.nowSec))
    reasons.push("market_closed");
  if (!rules.allowedShapes.includes(candidate.shape.kind) || !shapeValid(candidate, context))
    reasons.push("bad_shape");
  if (limit > BigInt(rules.perTradeCapUsdc)) reasons.push("cap_per_trade");
  if (spend.dailyUsdc + limit > BigInt(rules.dailyCapUsdc)) reasons.push("cap_daily");
  if (spend.marketUsdc(candidate.marketId) + limit > BigInt(rules.maxLossPerMarketUsdc))
    reasons.push("cap_market");
  if (
    spend.totalUsdc + limit > BigInt(rules.budgetUsdc) ||
    limit + spend.pendingUsdc > BigInt(context.availableUsdc)
  )
    reasons.push("cap_budget");
  if (!quoteMatches(trade, context)) reasons.push("quote_drift");
  if (
    trade.marketId !== candidate.marketId ||
    trade.chainId !== context.chainId ||
    trade.positionOwner.toLowerCase() !== context.positionOwner.toLowerCase()
  )
    reasons.push("forbidden");
  if (
    trade.payoutWad.length !== market?.grid.count ||
    trade.deadlineSec <= context.nowSec ||
    limit < BigInt(trade.chargeUsdc) ||
    limit > BigInt(candidate.spendUsdc) ||
    trade.call.data === "0x"
  )
    reasons.push("bad_request");
  return {
    candidateIndex: trade.candidateIndex,
    passed: reasons.length === 0,
    reasons,
    nets: BigInt(trade.collateralAfterWad) < BigInt(trade.collateralBeforeWad),
  };
}
