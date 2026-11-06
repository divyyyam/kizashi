import { expect, test } from "bun:test";
import {
  add,
  addScalar,
  collateralRequired,
  costDown,
  costUp,
  freed,
  isNonNeg,
  maxOf,
  normalise,
  topUp,
  tradeCharge,
} from "../src/index";

/** Deterministic 64-bit LCG so every run checks the same 200 cases. */
function rng(seed: bigint): () => bigint {
  let s = seed;
  return () => {
    s = (s * 6364136223846793005n + 1442695040888963407n) % 2n ** 64n;
    return s;
  };
}

const next = rng(20261106n);
const pick = (lo: bigint, hi: bigint): bigint => lo + (next() % (hi - lo + 1n));
const vec = (n: number, b: bigint, spread: bigint): bigint[] =>
  Array.from({ length: n }, () => pick(-spread * b, spread * b));
const gap = (b: bigint, n: number): bigint =>
  (b * BigInt(4 * n + 4) + 10n ** 18n - 1n) / 10n ** 18n + 2n;

test("I4: splitting never undercharges and overcharges by at most one gap (200 cases)", () => {
  for (let i = 0; i < 200; i++) {
    const n = Number(pick(2n, 64n));
    const b = pick(24n * 10n ** 16n, 10n ** 27n);
    const q = vec(n, b, 20n);
    const a = vec(n, b, 5n);
    const c = vec(n, b, 5n);
    const split = tradeCharge(q, a, b) + tradeCharge(add(q, a), c, b);
    const whole = tradeCharge(q, add(a, c), b);
    expect(split >= whole && split - whole <= gap(b, n)).toBe(true);
  }
});

test("I5: translation is exact for costUp and costDown (200 cases)", () => {
  for (let i = 0; i < 200; i++) {
    const n = Number(pick(2n, 64n));
    const b = pick(24n * 10n ** 16n, 10n ** 27n);
    const q = vec(n, b, 30n);
    const k = pick(-(10n ** 30n), 10n ** 30n);
    expect(costUp(addScalar(q, k), b)).toBe(costUp(q, b) + k);
    expect(costDown(addScalar(q, k), b)).toBe(costDown(q, b) + k);
    expect(costDown(q, b) >= maxOf(q)).toBe(true);
  }
});

test("I6: freed >= 0 and counter-trade top-up <= standalone top-up (200 cases)", () => {
  const unit = 10n ** 18n;
  for (let i = 0; i < 200; i++) {
    const n = Number(pick(2n, 16n));
    const tickets = Array.from({ length: Number(pick(1n, 6n)) }, () => vec(n, unit, 100n));
    expect(freed(tickets) >= 0n).toBe(true);
    const first = tickets[0] ?? [];
    const second = vec(n, unit, 100n);
    const { position } = normalise(Array(n).fill(0n), first);
    expect(isNonNeg(position)).toBe(true);
    expect(topUp(position, second) <= collateralRequired(second)).toBe(true);
  }
});
