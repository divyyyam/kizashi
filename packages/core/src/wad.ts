import { EXP_LN_MARGIN, EXP_MIN, USDC_TO_WAD, WAD } from "./constants";
import { KizashiError } from "./errors";
import { expWad, lnWad } from "./exp-ln";

/** Integer division rounding toward -infinity (d != 0). */
export function floorDiv(x: bigint, d: bigint): bigint {
  const q = x / d;
  return x % d !== 0n && x < 0n !== d < 0n ? q - 1n : q;
}

/** Integer division rounding toward +infinity (d != 0). */
export function ceilDiv(x: bigint, d: bigint): bigint {
  const q = x / d;
  return x % d !== 0n && x < 0n === d < 0n ? q + 1n : q;
}

/** USDC base units in, WAD out; exact. */
export function toWad(usdc: bigint): bigint {
  if (usdc < 0n) throw new KizashiError("NegativeAmount", "usdc must be >= 0");
  return usdc * USDC_TO_WAD;
}

/** WAD in (>= 0), USDC base units out; rounds down (payouts, releases). */
export function toUsdcDown(wad: bigint): bigint {
  if (wad < 0n) throw new KizashiError("NegativeAmount", "wad must be >= 0");
  return wad / USDC_TO_WAD;
}

/** WAD in (>= 0), USDC base units out; rounds up (charges, reserves). */
export function toUsdcUp(wad: bigint): bigint {
  if (wad < 0n) throw new KizashiError("NegativeAmount", "wad must be >= 0");
  return ceilDiv(wad, USDC_TO_WAD);
}

/** Signed WAD charge -> signed USDC transfer: positive rounds up, negative toward zero. */
export function chargeToUsdc(chargeWad: bigint): bigint {
  return chargeWad > 0n ? toUsdcUp(chargeWad) : -toUsdcDown(-chargeWad);
}

export const mulDown = (a: bigint, b: bigint): bigint => floorDiv(a * b, WAD);
export const mulUp = (a: bigint, b: bigint): bigint => ceilDiv(a * b, WAD);
export const divDown = (a: bigint, b: bigint): bigint => floorDiv(a * WAD, b);
export const divUp = (a: bigint, b: bigint): bigint => ceilDiv(a * WAD, b);

/** exp(x) for x <= 0; upper bound, capped at 1. Mirrors Wad.expNegUp. */
export function expNegUp(x: bigint): bigint {
  if (x > 0n) throw new KizashiError("ExpDomain", "x must be <= 0");
  if (x === 0n) return WAD;
  if (x < EXP_MIN) return EXP_LN_MARGIN;
  const r = expWad(x) + EXP_LN_MARGIN;
  // biome-ignore lint/complexity/useMathMinMax: bigint operands; Math.min/max do not accept bigint
  return r < WAD ? r : WAD;
}

/** exp(x) for x <= 0; lower bound, >= 0. Mirrors Wad.expNegDown. */
export function expNegDown(x: bigint): bigint {
  if (x > 0n) throw new KizashiError("ExpDomain", "x must be <= 0");
  if (x === 0n) return WAD;
  if (x < EXP_MIN) return 0n;
  const r = expWad(x) - EXP_LN_MARGIN;
  return r > 0n ? r : 0n;
}

/** ln(x) for x >= 1; upper bound. Mirrors Wad.lnAtLeastOneUp. */
export function lnAtLeastOneUp(x: bigint): bigint {
  if (x < WAD) throw new KizashiError("LnDomain", "x must be >= 1");
  if (x === WAD) return 0n;
  return lnWad(x) + EXP_LN_MARGIN;
}

/** ln(x) for x >= 1; lower bound, >= 0. Mirrors Wad.lnAtLeastOneDown. */
export function lnAtLeastOneDown(x: bigint): bigint {
  if (x < WAD) throw new KizashiError("LnDomain", "x must be >= 1");
  if (x === WAD) return 0n;
  const r = lnWad(x) - EXP_LN_MARGIN;
  return r > 0n ? r : 0n;
}
