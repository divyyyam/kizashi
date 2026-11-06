import { z } from "zod";

/**
 * Market metadata (v1): everything a person needs to understand and trust a market. It's pinned
 * to IPFS as canonical JSON, and the market's on-chain `rulesRef` is keccak256 of those exact
 * bytes, so the chain commits to this question, these outcomes and these rules. The Arkiv listing
 * carries the CIDs for discovery; readers re-hash and compare with the chain.
 */

export const MARKET_METADATA_VERSION = 1;

export const MARKET_CATEGORIES = [
  "crypto",
  "sports",
  "politics",
  "economics",
  "tech",
  "culture",
  "science",
  "other",
] as const;
export type MarketCategory = (typeof MARKET_CATEGORIES)[number];

export const RESOLUTION_SOURCES = ["manual", "uniswap-twap"] as const;
export type ResolutionSourceType = (typeof RESOLUTION_SOURCES)[number];

export const IMAGE_MIME_TYPES = ["image/webp", "image/png", "image/jpeg", "image/gif"] as const;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const cid = z.string().regex(/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,100})$/, "IPFS CID");
const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "address");
const decimal = z.string().regex(/^-?\d+(\.\d+)?$/, "decimal number");
const unixSec = z
  .number()
  .int()
  .positive()
  .max(2 ** 40);
const httpsUrl = z
  .url()
  .refine((value) => value.startsWith("https://"), "must be an https link")
  .max(300);

export const marketImageSchema = z.object({
  cid,
  mime: z.enum(IMAGE_MIME_TYPES),
  width: z.number().int().positive().max(8192),
  height: z.number().int().positive().max(8192),
});
export type MarketImage = z.infer<typeof marketImageSchema>;

export const binaryOutcomesSchema = z.object({
  kind: z.literal("binary"),
  /** Bucket 1 on chain. */
  yes: z.string().trim().min(1).max(32),
  /** Bucket 0 on chain. */
  no: z.string().trim().min(1).max(32),
});

export const curveOutcomesSchema = z.object({
  kind: z.literal("curve"),
  unit: z.string().trim().min(1).max(16),
  low: decimal,
  high: decimal,
  buckets: z.number().int().min(2).max(64),
  /** Decimal places of the grid (on-chain lo and w are scaled by 10^precision). */
  precision: z.number().int().min(0).max(18),
});

export const marketOutcomesSchema = z.discriminatedUnion("kind", [
  binaryOutcomesSchema,
  curveOutcomesSchema,
]);
export type MarketOutcomes = z.infer<typeof marketOutcomesSchema>;

export const resolutionSchema = z.object({
  source: z.enum(RESOLUTION_SOURCES),
  /** Where the answer comes from, in words: "CoinGecko ETH/USD daily close". */
  sourceName: z.string().trim().min(2).max(80),
  sourceUrl: httpsUrl.optional(),
  /** Exactly how the outcome is decided. */
  criteria: z.string().trim().min(20).max(3000),
  /** What happens if the source is unavailable, the event is cancelled, and so on. */
  edgeCases: z.string().trim().max(1500).optional(),
  /** KizashiResolver.DISPUTE_WINDOW for manual markets. */
  disputeWindowSec: z
    .number()
    .int()
    .nonnegative()
    .max(30 * 24 * 3600),
});
export type MarketResolution = z.infer<typeof resolutionSchema>;

export const marketMetadataSchema = z
  .object({
    v: z.literal(MARKET_METADATA_VERSION),
    question: z.string().trim().min(10).max(200),
    description: z.string().trim().max(5000),
    category: z.enum(MARKET_CATEGORIES),
    tags: z.array(z.string().trim().min(1).max(24)).max(5),
    image: marketImageSchema.optional(),
    outcomes: marketOutcomesSchema,
    /** Trading closes, and the market expires, at this time (the pool's closeTime). */
    closeTimeSec: unixSec,
    resolution: resolutionSchema,
    /** Initial liquidity the creator commits, in USDC base units (6 decimals). */
    subsidyUsdc: z.string().regex(/^[1-9]\d{0,15}$/),
    creator: address,
    createdAtSec: unixSec,
  })
  .superRefine((m, ctx) => {
    if (m.outcomes.kind === "curve" && Number(m.outcomes.high) <= Number(m.outcomes.low)) {
      ctx.addIssue({ code: "custom", path: ["outcomes", "high"], message: "high must exceed low" });
    }
    if (m.resolution.source === "uniswap-twap" && m.outcomes.kind !== "curve") {
      ctx.addIssue({
        code: "custom",
        path: ["resolution", "source"],
        message: "TWAP resolution needs a price range (curve) market",
      });
    }
    if (m.closeTimeSec <= m.createdAtSec) {
      ctx.addIssue({ code: "custom", path: ["closeTimeSec"], message: "close must be later" });
    }
  });
export type MarketMetadata = z.infer<typeof marketMetadataSchema>;
