import { WAD } from "./constants";
import { KizashiError } from "./errors";
import { type Grid, gridTop, validateGrid } from "./grid";

/** "Above threshold k": size on buckets k..n-1. 1 <= k <= n-1. Mirrors Shapes.step. */
export function step(n: number, k: number, size: bigint): bigint[] {
  if (!Number.isInteger(k) || k <= 0 || k >= n) throw new KizashiError("BadBucket", `${k} of ${n}`);
  return Array.from({ length: n }, (_, i) => (i >= k ? size : 0n));
}

/** size on buckets [from, to). Mirrors Shapes.range. "Below k" is range(n, 0, k, size). */
export function range(n: number, from: number, to: number, size: bigint): bigint[] {
  if (from >= to || to > n || from < 0)
    throw new KizashiError("BadRange", `[${from}, ${to}) of ${n}`);
  return Array.from({ length: n }, (_, i) => (i >= from && i < to ? size : 0n));
}

/** Weights below this (after normalizing the max to 1) are set to zero (market spec §3.2). */
export const GAUSSIAN_TAIL_CUTOFF = 1e-4;

const LN2 = Math.LN2;

/**
 * exp(x) from IEEE +, -, *, / only, so the result is identical in every JS runtime (Math.exp is
 * implementation-defined). Range reduction by ln 2, then a 20-term Taylor series.
 */
export function expDeterministic(x: number): number {
  if (x < -745) return 0;
  const k = Math.round(x / LN2);
  const r = x - k * LN2;
  let term = 1;
  let sum = 1;
  for (let i = 1; i <= 20; i++) {
    term = (term * r) / i;
    sum += term;
  }
  let scale = 1;
  const base = k >= 0 ? 2 : 0.5;
  for (let i = 0; i < Math.abs(k); i++) scale *= base;
  return sum * scale;
}

/** erfc via the Numerical Recipes Chebyshev fit (fractional error < 1.2e-7 everywhere). */
function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const poly =
    -z * z -
    1.26551223 +
    t *
      (1.00002368 +
        t *
          (0.37409196 +
            t *
              (0.09678418 +
                t *
                  (-0.18628806 +
                    t *
                      (0.27886807 +
                        t *
                          (-1.13520398 +
                            t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))));
  const ans = t * expDeterministic(poly);
  return x >= 0 ? ans : 2 - ans;
}

/** Standard normal CDF. */
export const normalCdf = (z: number): number => 0.5 * erfc(-z / Math.SQRT2);

/** Upper tail Q(z) = 1 - CDF(z), with Q(+inf) = 0 and Q(-inf) = 1. */
const upperTail = (z: number): number =>
  z === Number.POSITIVE_INFINITY
    ? 0
    : z === Number.NEGATIVE_INFINITY
      ? 1
      : 0.5 * erfc(z / Math.SQRT2);

/**
 * Normal mass on [za, zb] computed from the tail on the far side of the mean, so a bucket and its
 * mirror image run the identical float operations (exact symmetry, best tail accuracy).
 */
export function normalMass(za: number, zb: number): number {
  if (za >= 0) return upperTail(za) - upperTail(zb);
  if (zb <= 0) return upperTail(-zb) - upperTail(-za);
  return 1 - (upperTail(zb) + upperTail(-za));
}

/** Allowed sigma range for a grid: half a bucket to N/2 buckets (market spec §3.2). */
export function sigmaBounds(grid: Grid): { min: bigint; max: bigint } {
  return { min: grid.w / 2n, max: (BigInt(grid.n) * grid.w) / 2n };
}

/**
 * Discretised Gaussian over the grid as a unit payout shape (max entry exactly 1e18 WAD).
 * Inputs are exact grid-unit integers. Bucket 0 also takes the mass below lo and bucket N-1
 * the mass at or above the top, matching resolution (below lo -> 0, >= top -> N-1).
 * The CDF is the sole float step (NUMERICS); each weight converts to WAD once, rounded down.
 */
export function gaussianShape(grid: Grid, mean: bigint, sigma: bigint): bigint[] {
  validateGrid(grid);
  const { min, max } = sigmaBounds(grid);
  if (mean < grid.lo || mean > gridTop(grid))
    throw new KizashiError("BadShape", "mean outside the grid");
  if (sigma < min || sigma > max || sigma <= 0n)
    throw new KizashiError("BadShape", "sigma out of range");
  const s = Number(sigma);
  const z = (i: number): number => {
    if (i <= 0) return Number.NEGATIVE_INFINITY;
    if (i >= grid.n) return Number.POSITIVE_INFINITY;
    return Number(grid.lo + BigInt(i) * grid.w - mean) / s;
  };
  const raw = Array.from({ length: grid.n }, (_, i) => normalMass(z(i), z(i + 1)));
  const peak = Math.max(0, ...raw);
  if (!(peak > 0)) throw new KizashiError("BadShape", "degenerate curve");
  return raw.map((x) => {
    const w = x / peak;
    if (w < GAUSSIAN_TAIL_CUTOFF) return 0n;
    return w >= 1 ? WAD : BigInt(Math.floor(w * 1e18));
  });
}
