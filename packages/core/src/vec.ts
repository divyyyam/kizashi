import { KizashiError } from "./errors";

export type Vec = readonly bigint[];

function at(v: Vec, i: number): bigint {
  const x = v[i];
  if (x === undefined) throw new KizashiError("LengthMismatch", `index ${i} out of range`);
  return x;
}

function sameLength(a: Vec, b: Vec): void {
  if (a.length !== b.length) {
    throw new KizashiError("LengthMismatch", `expected ${a.length}, got ${b.length}`);
  }
}

function nonEmpty(a: Vec): void {
  if (a.length === 0) throw new KizashiError("LengthMismatch", "expected 1, got 0");
}

export function add(a: Vec, b: Vec): bigint[] {
  sameLength(a, b);
  return a.map((x, i) => x + at(b, i));
}

export function sub(a: Vec, b: Vec): bigint[] {
  sameLength(a, b);
  return a.map((x, i) => x - at(b, i));
}

export const addScalar = (a: Vec, k: bigint): bigint[] => a.map((x) => x + k);
/** Integer factor (not WAD), exact. */
export const scale = (a: Vec, k: bigint): bigint[] => a.map((x) => x * k);

export function minOf(a: Vec): bigint {
  nonEmpty(a);
  // biome-ignore lint/complexity/useMathMinMax: bigint operands; Math.min/max do not accept bigint
  return a.reduce((m, x) => (x < m ? x : m));
}

export function maxOf(a: Vec): bigint {
  nonEmpty(a);
  // biome-ignore lint/complexity/useMathMinMax: bigint operands; Math.min/max do not accept bigint
  return a.reduce((m, x) => (x > m ? x : m));
}

/** Index of the first maximum. */
export function argMax(a: Vec): number {
  nonEmpty(a);
  let index = 0;
  for (let i = 1; i < a.length; i++) if (at(a, i) > at(a, index)) index = i;
  return index;
}

export const isNonNeg = (a: Vec): boolean => a.every((x) => x >= 0n);

export { at };
