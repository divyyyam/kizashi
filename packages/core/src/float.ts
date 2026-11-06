/** Display-only helpers (pixels). Never imported by bigint code; never used for money. */
import { type Grid, validateGrid } from "./grid";
import { normalMass } from "./shapes";
import type { Vec } from "./vec";

/** Float prices for charts: exp((q_i - max)/b) / sum. */
export function pricesFloat(q: Vec, b: bigint): number[] {
  const bf = Number(b);
  // biome-ignore lint/complexity/useMathMinMax: bigint operands; Math.min/max do not accept bigint
  const m = q.reduce((a, x) => (x > a ? x : a));
  const terms = q.map((x) => Math.exp(Number(x - m) / bf));
  const total = terms.reduce((s, x) => s + x, 0);
  return terms.map((x) => x / total);
}

/** Gaussian bucket masses normalised to sum 1, for drawing the user's draft curve. */
export function gaussianDisplay(grid: Grid, mean: number, sigma: number): number[] {
  validateGrid(grid);
  const lo = Number(grid.lo);
  const w = Number(grid.w);
  const z = (i: number): number =>
    i <= 0
      ? Number.NEGATIVE_INFINITY
      : i >= grid.n
        ? Number.POSITIVE_INFINITY
        : (lo + i * w - mean) / sigma;
  const raw = Array.from({ length: grid.n }, (_, i) => normalMass(z(i), z(i + 1)));
  const total = raw.reduce((s, x) => s + x, 0);
  return raw.map((x) => x / total);
}
