import { formatPercent, formatUsdc } from "@/lib/format";

const USDC_PER_DOLLAR = 1_000_000;
const WAD_PER_MICRO = 10n ** 12n;
const MICROS = 1_000_000;
const BUDGET_PATTERN = /^\d{1,7}(\.\d{0,2})?$/;

/** Model dollars to USDC base units, rounded to the nearest base unit for display only. */
export function usdToUsdc(amountUsd: number): bigint {
  return BigInt(Math.round(amountUsd * USDC_PER_DOLLAR));
}

/** A typed budget ("20", "12.5") to USDC base units; null when it is not a positive amount. */
export function parseBudgetUsdc(input: string): bigint | null {
  const trimmed = input.trim();
  if (!BUDGET_PATTERN.test(trimmed)) return null;
  const [whole = "0", cents = ""] = trimmed.split(".");
  const amount = BigInt(whole) * 1_000_000n + BigInt(cents.padEnd(2, "0")) * 10_000n;
  return amount > 0n ? amount : null;
}

export function formatUsd(amountUsd: number): string {
  return `$${formatUsdc(usdToUsdc(amountUsd))}`;
}

export function formatUsdcAsUsd(amountUsdc: bigint): string {
  return `$${formatUsdc(amountUsdc)}`;
}

/** Expected returns carry their sign so a loss never reads as a gain. */
export function formatSignedUsd(amountUsd: number): string {
  const usdc = usdToUsdc(amountUsd);
  if (usdc < 0n) return `-$${formatUsdc(-usdc)}`;
  return `+$${formatUsdc(usdc)}`;
}

export function formatProbability(probability: number): string {
  return formatPercent(BigInt(Math.round(probability * MICROS)) * WAD_PER_MICRO);
}
