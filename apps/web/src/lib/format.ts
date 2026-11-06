/**
 * format.ts — display-layer converters.
 *
 * Rules:
 * - All amounts arrive as bigint in base units (USDC 6 decimals = 1e6 per dollar).
 * - Probabilities arrive as bigint WAD (1e18 = 100%).
 * - Never mutate or round in a way that changes meaning.
 * - A charge of 4_000n (< 0.01 USDC) renders "< 0.01", not "0.00".
 */

const USDC_DECIMALS = 6n;
const USDC_SCALE = 10n ** USDC_DECIMALS; // 1_000_000n
const WAD = 10n ** 18n;

export type FormatUsdcOptions = {
  /** Include the "USDC" suffix. Default: false */
  readonly suffix?: boolean;
};

/**
 * Formats a bigint USDC amount (6-decimal base units) for display.
 * Always two decimal places, thousands separators, tabular figures.
 * A sub-cent positive amount renders as "< 0.01" to avoid "0.00".
 */
export function formatUsdc(amount: bigint, opts?: FormatUsdcOptions): string {
  const isNegative = amount < 0n;
  const abs = isNegative ? -amount : amount;

  const whole = abs / USDC_SCALE;
  const frac = abs % USDC_SCALE;

  // Sub-cent: > 0 but would display as 0.00
  const isTiny = abs > 0n && abs < 10_000n; // < 0.01 USDC
  if (isTiny) {
    const result = "< 0.01";
    return opts?.suffix === true ? `${result} USDC` : result;
  }

  // Format whole part with thousands separators
  const wholeStr = whole.toLocaleString("en-US");
  // Fraction: pad to 6 digits, then take first 2 (truncate, not round)
  const fracPadded = frac.toString().padStart(Number(USDC_DECIMALS), "0");
  const fracStr = fracPadded.slice(0, 2);

  const formatted = `${isNegative ? "-" : ""}${wholeStr}.${fracStr}`;
  return opts?.suffix === true ? `${formatted} USDC` : formatted;
}

/**
 * Formats a WAD probability (1e18 = 100%) as a percentage string.
 * One decimal place, e.g. "18.3%".
 */
export function formatPercent(wad: bigint): string {
  // wad * 1000 / WAD gives tenths of a percent as an integer
  const tenths = (wad * 1_000n) / WAD;
  const whole = tenths / 10n;
  const frac = tenths % 10n;
  return `${whole}.${frac}%`;
}

/**
 * Formats a hex address as "0x12ab…89cd".
 * Full value must be in the element's title attribute.
 */
export function formatAddress(address: `0x${string}`): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
