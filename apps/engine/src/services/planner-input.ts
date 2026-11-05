import type { MarketContext } from "@kizashi/schemas/engine";
import { requireContext } from "../graph/nodes/core";
import type { EngineState } from "../graph/state";
import { spendTotals } from "./spend";

function summarise(market: MarketContext) {
  const lower = BigInt(market.grid.lo);
  const width = (BigInt(market.grid.hi) - lower) / BigInt(market.grid.count);
  const weighted = market.pricesWad.map((price, index) => ({
    index,
    weight: BigInt(price),
    center: lower * 2n + width * BigInt(index * 2 + 1),
  }));
  const mass = weighted.reduce((total, bucket) => total + bucket.weight, 0n);
  const mean =
    mass === 0n
      ? null
      : weighted.reduce((total, bucket) => total + bucket.center * bucket.weight, 0n) / mass;
  const variance =
    mean === null || mass === 0n
      ? null
      : weighted.reduce(
          (total, bucket) => total + (bucket.center - mean) ** 2n * bucket.weight,
          0n,
        ) / mass;
  return {
    ...market,
    summary: {
      meanTwiceScaled: mean?.toString() ?? null,
      varianceFourTimesScaled: variance?.toString() ?? null,
      topBuckets: [...weighted]
        .sort((a, b) => (a.weight === b.weight ? a.index - b.index : a.weight > b.weight ? -1 : 1))
        .slice(0, 3)
        .map(({ index }) => index),
    },
  };
}

export function plannerInput(state: EngineState) {
  const context = requireContext(state);
  const spend = spendTotals(context.spend, context.nowSec);
  return JSON.stringify({
    prompt: state.prompt,
    rulesHash: state.rulesHash,
    rules: state.ruleSet,
    chainId: context.chainId,
    positionOwner: context.positionOwner,
    fetchedAtBlock: context.fetchedAtBlock,
    nowSec: context.nowSec,
    markets: context.markets
      .filter((market) => state.ruleSet.allowedMarketIds.includes(market.marketId))
      .map(summarise),
    budget: {
      availableUsdc: context.availableUsdc,
      spentUsdc: spend.totalUsdc.toString(),
      spentDailyUsdc: spend.dailyUsdc.toString(),
      remainingUsdc: (BigInt(state.ruleSet.budgetUsdc) - spend.totalUsdc).toString(),
    },
    journal: state.journal.slice(-30),
    priorVerdicts: state.verdicts,
  });
}
