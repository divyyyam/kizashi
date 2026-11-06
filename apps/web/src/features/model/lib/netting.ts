import type { OutcomeDomain } from "./normal";

/** One position in a market: what was paid and what it pays at each outcome, in US dollars. */
export type PayoutLeg = {
  readonly stakeUsd: number;
  readonly payoutAt: (x: number) => number;
};

export type NettingEstimate = {
  /** Each leg locked against its own worst case, then summed. */
  readonly grossLockedUsd: number;
  /** The legs locked together against the worst case of their summed payout. */
  readonly nettedLockedUsd: number;
};

const OUTCOME_SAMPLES = 800;

function minOver(domain: OutcomeDomain, fn: (x: number) => number): number {
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i <= OUTCOME_SAMPLES; i++) {
    min = Math.min(min, fn(domain.lo + ((domain.hi - domain.lo) * i) / OUTCOME_SAMPLES));
  }
  return min;
}

/**
 * Sampled on a fine outcome grid, so it is an estimate of the on-chain figure, which nets the
 * same payout vectors over the market's buckets.
 */
export function estimateNetting(
  legs: readonly PayoutLeg[],
  domain: OutcomeDomain,
): NettingEstimate {
  const grossLockedUsd = legs.reduce(
    (total, leg) => total + Math.max(0, leg.stakeUsd - minOver(domain, leg.payoutAt)),
    0,
  );
  const totalStakeUsd = legs.reduce((total, leg) => total + leg.stakeUsd, 0);
  const floorPayoutUsd = minOver(domain, (x) =>
    legs.reduce((total, leg) => total + leg.payoutAt(x), 0),
  );
  return { grossLockedUsd, nettedLockedUsd: Math.max(0, totalStakeUsd - floorPayoutUsd) };
}
