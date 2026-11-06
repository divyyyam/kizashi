/** A normal belief over a market's outcome, in the market's own unit (km/h, runs, minutes). */
export type NormalView = { readonly mean: number; readonly sd: number };

/** Closed interval of outcomes a market can settle on, in the market's unit. */
export type OutcomeDomain = { readonly lo: number; readonly hi: number };

const SQRT_TWO_PI = Math.sqrt(2 * Math.PI);

export function normalPdf(x: number, view: NormalView): number {
  const z = (x - view.mean) / view.sd;
  return Math.exp(-0.5 * z * z) / (view.sd * SQRT_TWO_PI);
}

// Abramowitz & Stegun 7.1.26: |error| < 1.5e-7, far below one cent on any stake shown.
const ERF_P = 0.3275911;
const ERF_A = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429] as const;

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + ERF_P * ax);
  const poly = ERF_A.reduceRight((acc, coefficient) => acc * t + coefficient, 0) * t;
  return sign * (1 - poly * Math.exp(-ax * ax));
}

export function normalCdf(x: number, view: NormalView): number {
  return 0.5 * (1 + erf((x - view.mean) / (view.sd * Math.SQRT2)));
}

// Simpson's rule needs an even interval count; 600 keeps the error under 1e-9 for these widths.
const SIMPSON_INTERVALS = 600;

/** Numeric integral of `fn` over `domain` by composite Simpson's rule. */
export function integrate(fn: (x: number) => number, domain: OutcomeDomain): number {
  const h = (domain.hi - domain.lo) / SIMPSON_INTERVALS;
  let sum = fn(domain.lo) + fn(domain.hi);
  for (let i = 1; i < SIMPSON_INTERVALS; i++) {
    sum += fn(domain.lo + i * h) * (i % 2 === 0 ? 2 : 4);
  }
  return (sum * h) / 3;
}
