import type { RuleSet, TickContext } from "@kizashi/schemas/engine";
import { spendTotals } from "./spend";

export function stopReason(context: TickContext, rules: RuleSet) {
  if (context.killSwitch) return "kill_switch" as const;
  if (context.nowSec >= rules.stopAtSec) return "expired" as const;
  const spent = spendTotals(context.spend, context.nowSec).totalUsdc;
  const floor = context.markets
    .filter((market) => rules.allowedMarketIds.includes(market.marketId))
    .reduce((total, market) => total + BigInt(market.releasableUsdc), 0n);
  if (spent - floor >= BigInt(rules.maxDrawdownUsdc)) return "drawdown" as const;
  if (spent >= BigInt(rules.budgetUsdc) || BigInt(context.availableUsdc) === 0n)
    return "budget_exhausted" as const;
  const allowed = rules.allowedMarketIds.map((id) =>
    context.markets.find((market) => market.marketId === id),
  );
  // Missing markets are unavailable context, never evidence that every market is closed.
  if (
    allowed.length > 0 &&
    allowed.every(
      (market) => market && (market.state !== "open" || market.closeTimeSec <= context.nowSec),
    )
  )
    return "all_markets_closed" as const;
  return null;
}
