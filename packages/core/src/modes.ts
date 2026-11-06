/** market spec §4: the deterministic bridge between Simple and Expressive modes. */
import { WAD } from "./constants";
import { KizashiError } from "./errors";
import { type Grid, gridTop, validateGrid } from "./grid";
import { sigmaBounds } from "./shapes";
import type { Vec } from "./vec";

export type Direction = "above" | "below";
export type SimpleBet = { readonly direction: Direction; readonly threshold: number };
export type ExpressiveBet = { readonly mean: bigint; readonly sigma: bigint };

const clamp = (x: bigint, lo: bigint, hi: bigint): bigint => (x < lo ? lo : x > hi ? hi : x);

/** Crowd median in grid units: centre of the first bucket where cumulative price reaches 1/2. */
export function crowdMedian(grid: Grid, prices: Vec): bigint {
  validateGrid(grid);
  if (prices.length !== grid.n) throw new KizashiError("LengthMismatch", `expected ${grid.n}`);
  let cumulative = 0n;
  for (let i = 0; i < grid.n; i++) {
    cumulative += prices[i] ?? 0n;
    if (cumulative * 2n >= WAD) return grid.lo + BigInt(i) * grid.w + grid.w / 2n;
  }
  return gridTop(grid) - grid.w / 2n;
}

/** Nearest bucket edge index to a grid value, as a valid step threshold in [1, n-1]. Ties go up. */
export function nearestThreshold(grid: Grid, value: bigint): number {
  const offset = value - grid.lo;
  const k = offset >= 0n ? (offset * 2n + grid.w) / (2n * grid.w) : 0n;
  const n = BigInt(grid.n);
  // biome-ignore lint/complexity/useMathMinMax: bigint operands; Math.min/max do not accept bigint
  return Number(k < 1n ? 1n : k > n - 1n ? n - 1n : k);
}

/** Expressive -> Simple: Above if the curve mean >= crowd median, at the edge nearest mean -/+ sigma. */
export function expressiveToSimple(grid: Grid, bet: ExpressiveBet, median: bigint): SimpleBet {
  const direction: Direction = bet.mean >= median ? "above" : "below";
  const target = direction === "above" ? bet.mean - bet.sigma : bet.mean + bet.sigma;
  return { direction, threshold: nearestThreshold(grid, target) };
}

/** Simple -> Expressive: sigma = 2 buckets (clamped), mean = threshold +/- sigma (clamped to the grid). */
export function simpleToExpressive(grid: Grid, bet: SimpleBet): ExpressiveBet {
  validateGrid(grid);
  if (!Number.isInteger(bet.threshold) || bet.threshold < 1 || bet.threshold > grid.n - 1) {
    throw new KizashiError("BadBucket", `${bet.threshold} of ${grid.n}`);
  }
  const { min, max } = sigmaBounds(grid);
  const sigma = clamp(2n * grid.w, min, max);
  const edge = grid.lo + BigInt(bet.threshold) * grid.w;
  const mean = bet.direction === "above" ? edge + sigma : edge - sigma;
  return { mean: clamp(mean, grid.lo, gridTop(grid)), sigma };
}
