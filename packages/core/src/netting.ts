import { add, addScalar, minOf, type Vec } from "./vec";

/** Raw signed minimum; for an actual position this is the releasable floor. */
export const floorOf = (v: Vec): bigint => minOf(v);

/** K(v) = max(0, -min v): standalone downside requirement. */
export function collateralRequired(v: Vec): bigint {
  const m = minOf(v);
  return m < 0n ? -m : 0n;
}

/** Uniform top-up K(P + delta) that keeps the position non-negative. */
export const topUp = (position: Vec, delta: Vec): bigint =>
  collateralRequired(add(position, delta));

/** k, delta + k*1 and the resulting position. Mirrors Netting.normalise. */
export function normalise(
  position: Vec,
  delta: Vec,
): { topUp: bigint; normalized: bigint[]; position: bigint[] } {
  const k = topUp(position, delta);
  const normalized = addScalar(delta, k);
  return { topUp: k, normalized, position: add(position, normalized) };
}

function sum(tickets: readonly Vec[]): bigint[] {
  const [first, ...rest] = tickets;
  if (first === undefined) return [];
  return rest.reduce<bigint[]>((acc, t) => add(acc, t), [...first]);
}

/** Sum of raw ticket minima (not a collateral value). Empty -> 0. */
export const grossFloors = (tickets: readonly Vec[]): bigint =>
  tickets.reduce((s, t) => s + minOf(t), 0n);

/** Minimum of the summed tickets (not a collateral value). Empty -> 0. */
export const nettedFloor = (tickets: readonly Vec[]): bigint =>
  tickets.length === 0 ? 0n : minOf(sum(tickets));

/** G = sum K(ticket). */
export const grossCollateral = (tickets: readonly Vec[]): bigint =>
  tickets.reduce((s, t) => s + collateralRequired(t), 0n);

/** N = K(sum tickets). */
export const nettedCollateral = (tickets: readonly Vec[]): bigint =>
  tickets.length === 0 ? 0n : collateralRequired(sum(tickets));

/** F = G - N >= 0. */
export const freed = (tickets: readonly Vec[]): bigint =>
  grossCollateral(tickets) - nettedCollateral(tickets);
