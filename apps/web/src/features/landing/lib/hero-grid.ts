import { type Grid, gaussianDisplay } from "@kizashi/core";

/** The hero's example grid: 32 one-unit buckets from 120 to 152 (an illustrative SOL closing price, USD). */
export const HERO_GRID: Grid = { n: 32, lo: 120n, w: 1n };
export const HERO_LOW = 120;
export const HERO_HIGH = 152;

export const MEAN_START = 141;
export const MEAN_STEP = 0.5;
export const SIGMA_START = 2.5;
export const SIGMA_MIN = 1;
export const SIGMA_MAX = 7;
export const SIGMA_STEP = 0.5;

export type HeroCurve = {
  readonly masses: readonly number[];
  readonly crowd: readonly number[];
  readonly peakBucket: number;
  readonly peakShare: number;
};

/** The draft curve's bucket masses against a fresh market, whose crowd is flat at 1/N. */
export function heroCurve(mean: number, sigma: number): HeroCurve {
  const masses = gaussianDisplay(HERO_GRID, mean, sigma);
  const peakBucket = masses.reduce((best, mass, i) => (mass > (masses[best] ?? 0) ? i : best), 0);
  return {
    masses,
    crowd: Array.from({ length: HERO_GRID.n }, () => 1 / HERO_GRID.n),
    peakBucket,
    peakShare: masses[peakBucket] ?? 0,
  };
}

export const clampMean = (value: number): number =>
  Math.min(HERO_HIGH, Math.max(HERO_LOW, Math.round(value / MEAN_STEP) * MEAN_STEP));

export const clampSigma = (value: number): number =>
  Math.min(SIGMA_MAX, Math.max(SIGMA_MIN, value));

// Display share to WAD so it renders through the app's single percent formatter.
const SHARE_SCALE = 1_000_000;
export const shareToWad = (share: number): bigint =>
  BigInt(Math.round(share * SHARE_SCALE)) * 10n ** 12n;
