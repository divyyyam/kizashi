import { MARKET_CATEGORIES, RESOLUTION_SOURCES } from "@kizashi/schemas/market";
import { z } from "zod";

/** Trading must stay open at least this long after creation. */
export const MIN_CLOSE_LEAD_MS = 30 * 60 * 1000;
/** Pool bounds: KizashiPool accepts 1e6..1e15 USDC base units of subsidy. */
export const MIN_SUBSIDY_USDC = 1;
export const MAX_SUBSIDY_USDC = 1_000_000;

const decimal = /^-?\d+(\.\d+)?$/;
const usdc = /^\d+(\.\d{1,6})?$/;

export const createFormSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(10, "At least 10 characters")
      .max(200, "At most 200 characters"),
    description: z.string().trim().max(5000, "At most 5000 characters"),
    category: z.enum(MARKET_CATEGORIES),
    tags: z
      .string()
      .trim()
      .refine((v) => splitTags(v).length <= 5, "Up to 5 tags")
      .refine((v) => splitTags(v).every((t) => t.length <= 24), "Each tag at most 24 characters"),
    kind: z.enum(["binary", "curve"]),
    yesLabel: z.string().trim().max(32),
    noLabel: z.string().trim().max(32),
    unit: z.string().trim().max(16),
    low: z.string().trim(),
    high: z.string().trim(),
    buckets: z.string().trim(),
    closesAt: z
      .string()
      .refine(
        (v) => Number.isFinite(Date.parse(v)) && Date.parse(v) >= Date.now() + MIN_CLOSE_LEAD_MS,
        "Pick a time at least 30 minutes from now",
      ),
    source: z.enum(RESOLUTION_SOURCES),
    sourceName: z.string().trim().min(2, "Name the source").max(80),
    sourceUrl: z
      .string()
      .trim()
      .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Use a full https:// link")
      .refine((v) => v.length <= 300, "Link is too long"),
    criteria: z
      .string()
      .trim()
      .min(20, "Spell out exactly how this resolves (20+ characters)")
      .max(3000),
    edgeCases: z.string().trim().max(1500),
    subsidy: z
      .string()
      .trim()
      .refine((v) => usdc.test(v), "A USDC amount, up to 6 decimals")
      .refine(
        (v) => Number(v) >= MIN_SUBSIDY_USDC && Number(v) <= MAX_SUBSIDY_USDC,
        `Between ${MIN_SUBSIDY_USDC} and ${MAX_SUBSIDY_USDC.toLocaleString()} USDC`,
      ),
  })
  .superRefine((f, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (f.kind === "binary") {
      if (!f.yesLabel) issue("yesLabel", "Label the YES outcome");
      if (!f.noLabel) issue("noLabel", "Label the NO outcome");
      if (f.yesLabel && f.yesLabel.toLowerCase() === f.noLabel.toLowerCase())
        issue("noLabel", "Outcomes must differ");
      if (f.source === "uniswap-twap")
        issue("source", "TWAP resolution needs a price range market");
      return;
    }
    if (!f.unit) issue("unit", "Unit, e.g. USD or goals");
    if (!decimal.test(f.low)) issue("low", "A number");
    if (!decimal.test(f.high)) issue("high", "A number");
    const n = Number(f.buckets);
    if (!/^\d+$/.test(f.buckets) || n < 2 || n > 64) issue("buckets", "2 to 64 ranges");
    if (decimal.test(f.low) && decimal.test(f.high)) {
      if (Number(f.high) <= Number(f.low)) issue("high", "Must be above the low end");
      else if (gridOf(f) === undefined)
        issue("buckets", "The range must split into equal steps at this precision");
    }
  });

export type CreateFormValues = z.infer<typeof createFormSchema>;

export function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function decimalsOf(value: string): number {
  return value.split(".")[1]?.length ?? 0;
}

export function scaled(value: string, precision: number): bigint {
  const negative = value.startsWith("-");
  const [whole = "0", fraction = ""] = value.replace("-", "").split(".");
  const out =
    BigInt(whole) * 10n ** BigInt(precision) + BigInt(fraction.padEnd(precision, "0") || "0");
  return negative ? -out : out;
}

/** On-chain grid (Config.n / lo / w) for the form, or undefined if the range doesn't divide. */
export function gridOf(
  f: Pick<CreateFormValues, "kind" | "low" | "high" | "buckets">,
): { n: bigint; lo: bigint; w: bigint; precision: number } | undefined {
  // Binary: bucket 0 = NO, bucket 1 = YES. The grid values are only indices.
  if (f.kind === "binary") return { n: 2n, lo: 0n, w: 1n, precision: 0 };
  if (!decimal.test(f.low) || !decimal.test(f.high) || !/^\d+$/.test(f.buckets)) return undefined;
  const precision = Math.min(18, Math.max(decimalsOf(f.low), decimalsOf(f.high)));
  const lo = scaled(f.low, precision);
  const hi = scaled(f.high, precision);
  const n = BigInt(f.buckets);
  if (n < 2n || hi <= lo || (hi - lo) % n !== 0n) return undefined;
  return { n, lo, w: (hi - lo) / n, precision };
}

export const STEPS = ["Question", "Outcomes", "Resolution", "Liquidity"] as const;

export const STEP_FIELDS: (keyof CreateFormValues)[][] = [
  ["question", "description", "category", "tags"],
  ["kind", "yesLabel", "noLabel", "unit", "low", "high", "buckets"],
  ["closesAt", "source", "sourceName", "sourceUrl", "criteria", "edgeCases"],
  ["subsidy"],
];
