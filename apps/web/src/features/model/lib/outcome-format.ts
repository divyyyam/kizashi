// Outcomes are shown to a tenth of the market unit: 147.5 km/h, 25 runs.
const OUTCOME_DECIMALS = 1;

export function formatOutcome(value: number): string {
  const fixed = value.toFixed(OUTCOME_DECIMALS);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

/** "2.4": how many times tighter one spread is than another, to one decimal. */
export function formatRatio(ratio: number): string {
  return ratio.toFixed(OUTCOME_DECIMALS);
}
