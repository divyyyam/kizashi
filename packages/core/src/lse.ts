import { WAD } from "./constants";
import { KizashiError } from "./errors";
import { add, maxOf, type Vec } from "./vec";
import {
  divDown,
  divUp,
  expNegDown,
  expNegUp,
  lnAtLeastOneDown,
  lnAtLeastOneUp,
  mulDown,
  mulUp,
} from "./wad";

function checkB(b: bigint): void {
  if (b <= 0n) throw new KizashiError("BadLiquidity", `b=${b}`);
}

const lnN = (n: number): bigint => lnAtLeastOneUp(BigInt(n) * WAD);

/** Upper bound of C(q) = b ln sum exp(q_i/b), WAD. Mirrors LSE.costUp. */
export function costUp(q: Vec, b: bigint): bigint {
  checkB(b);
  const m = maxOf(q);
  let sum = 0n;
  for (const x of q) sum += expNegUp(divUp(x - m, b));
  return m + mulUp(b, lnAtLeastOneUp(sum));
}

/** Lower bound of C(q), WAD. Mirrors LSE.costDown. */
export function costDown(q: Vec, b: bigint): bigint {
  checkB(b);
  const m = maxOf(q);
  let sum = 0n;
  for (const x of q) sum += expNegDown(divDown(x - m, b));
  return m + mulDown(b, lnAtLeastOneDown(sum));
}

/** Upper bound of the charge for q -> q + delta: costUp(q + delta) - costDown(q). */
export const tradeCharge = (q: Vec, delta: Vec, b: bigint): bigint =>
  costUp(add(q, delta), b) - costDown(q, b);

/** Probability WAD per bucket, each rounded down; sum <= 1e18. Mirrors LSE.prices. */
export function prices(q: Vec, b: bigint): bigint[] {
  checkB(b);
  const m = maxOf(q);
  let sumUp = 0n;
  for (const x of q) sumUp += expNegUp(divUp(x - m, b));
  return q.map((x) => divDown(expNegDown(divDown(x - m, b)), sumUp));
}

/** b = S / ln N rounded down (b * ln N <= S). Mirrors LSE.bFromSubsidy. */
export function bFromSubsidy(subsidyWad: bigint, n: number): bigint {
  const b = divDown(subsidyWad, lnN(n));
  checkB(b);
  return b;
}

/** Maker loss bound b * ln N, rounded up; equals costUp of the zero vector. */
export const lossBound = (b: bigint, n: number): bigint => mulUp(b, lnN(n));

function chargeAt(q: Vec, b: bigint, unit: Vec, size: bigint): bigint {
  return tradeCharge(
    q,
    unit.map((u) => mulDown(u, size)),
    b,
  );
}

/** Largest WAD size s with tradeCharge(q, s * unit) <= budget. Mirrors LSE.maxSizeForBudget. */
export function maxSizeForBudget(q: Vec, b: bigint, unit: Vec, budgetWad: bigint): bigint {
  if (maxOf(unit) <= 0n) throw new KizashiError("ZeroTrade", "unit shape is all zero");
  if (budgetWad <= 0n) return 0n;
  let lo = 0n;
  let hi = budgetWad;
  for (let i = 0; i < 64 && chargeAt(q, b, unit, hi) <= budgetWad; i++) {
    lo = hi;
    hi *= 2n;
  }
  while (hi - lo > 1n) {
    const mid = lo + (hi - lo) / 2n;
    if (chargeAt(q, b, unit, mid) <= budgetWad) lo = mid;
    else hi = mid;
  }
  return lo;
}
