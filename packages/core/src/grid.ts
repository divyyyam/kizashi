import { BUCKET_COUNT_MAX, BUCKET_COUNT_MIN } from "./constants";
import { KizashiError } from "./errors";

/** Grid in the market's unit precision (not USDC). Bucket i covers [lo + i*w, lo + (i+1)*w). */
export type Grid = { readonly n: number; readonly lo: bigint; readonly w: bigint };

export function validateGrid(grid: Grid): void {
  if (
    !Number.isInteger(grid.n) ||
    grid.n < BUCKET_COUNT_MIN ||
    grid.n > BUCKET_COUNT_MAX ||
    grid.w <= 0n
  ) {
    throw new KizashiError("BadGrid", `n=${grid.n} w=${grid.w}`);
  }
}

/** Clamped bucket index for a value in grid units. Exact; mirrors Grid.bucketOf. */
export function bucketOf(grid: Grid, value: bigint): number {
  if (value < grid.lo) return 0;
  const index = (value - grid.lo) / grid.w;
  return index >= BigInt(grid.n) ? grid.n - 1 : Number(index);
}

/** [from, to) edges of bucket i in grid units. */
export function bounds(grid: Grid, i: number): { from: bigint; to: bigint } {
  if (!Number.isInteger(i) || i < 0 || i >= grid.n)
    throw new KizashiError("BadBucket", `${i} of ${grid.n}`);
  const from = grid.lo + BigInt(i) * grid.w;
  return { from, to: from + grid.w };
}

/** Upper edge of the grid (lo + n*w). */
export const gridTop = (grid: Grid): bigint => grid.lo + BigInt(grid.n) * grid.w;
