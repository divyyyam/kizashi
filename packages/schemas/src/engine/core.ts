import { z } from "zod";
import { addressSchema, unixSecondsSchema } from "./common";

export const unsignedAmountSchema = z.string().regex(/^(0|[1-9][0-9]*)$/);
export const signedAmountSchema = z.string().regex(/^(0|-?[1-9][0-9]*)$/);
const bytesSchema = z.string().regex(/^0x(?:[\da-fA-F]{2})*$/);
const marketIdSchema = z.string().min(1);

export const gridSchema = z
  .object({
    lo: signedAmountSchema,
    hi: signedAmountSchema,
    count: z.number().int().min(2).max(64),
    precision: z.number().int().nonnegative(),
  })
  .strict()
  .refine(
    (grid) =>
      BigInt(grid.hi) > BigInt(grid.lo) &&
      (BigInt(grid.hi) - BigInt(grid.lo)) % BigInt(grid.count) === 0n,
    "The grid must have equal positive-width buckets.",
  );

export const marketContextSchema = z
  .object({
    marketId: marketIdSchema,
    question: z.string().min(1),
    unit: z.string().min(1),
    grid: gridSchema,
    state: z.enum(["open", "closed", "resolved"]),
    closeTimeSec: unixSecondsSchema,
    pricesWad: z.array(unsignedAmountSchema).min(2).max(64),
    positionWad: z.array(unsignedAmountSchema).min(2).max(64),
    releasableUsdc: unsignedAmountSchema,
  })
  .strict()
  .refine(
    (market) =>
      market.pricesWad.length === market.grid.count &&
      market.positionWad.length === market.grid.count,
    "Vectors must match the market grid.",
  );

export const spendEntrySchema = z
  .object({
    tradeId: z.string().min(1),
    marketId: marketIdSchema,
    spendUsdc: unsignedAmountSchema,
    status: z.enum(["reserved", "sent", "confirmed", "failed", "cancelled", "expired"]),
    atSec: unixSecondsSchema,
    expiresAtSec: unixSecondsSchema,
  })
  .strict();

export const tickContextSchema = z
  .object({
    chainId: z.number().int().positive(),
    positionOwner: addressSchema,
    fetchedAtBlock: unsignedAmountSchema,
    nowSec: unixSecondsSchema,
    availableUsdc: unsignedAmountSchema,
    killSwitch: z.boolean(),
    markets: z.array(marketContextSchema),
    spend: z.array(spendEntrySchema),
  })
  .strict()
  .refine(
    (context) =>
      new Set(context.markets.map((market) => market.marketId)).size === context.markets.length &&
      new Set(context.spend.map((entry) => entry.tradeId)).size === context.spend.length &&
      context.spend.every((entry) => entry.atSec <= context.nowSec),
    "Market and trade identities must be unique.",
  );

// Adapter contract only: calldata and Formula outputs must come from reviewed producers.
export const compiledTradeSchema = z
  .object({
    candidateIndex: z.number().int().min(0).max(2),
    marketId: marketIdSchema,
    chainId: z.number().int().positive(),
    positionOwner: addressSchema,
    quotedAtBlock: unsignedAmountSchema,
    payoutWad: z.array(signedAmountSchema).min(2).max(64),
    localChargeWad: signedAmountSchema,
    chainChargeWad: signedAmountSchema,
    chargeUsdc: signedAmountSchema,
    limitUsdc: unsignedAmountSchema,
    topUpWad: unsignedAmountSchema,
    collateralBeforeWad: unsignedAmountSchema,
    collateralAfterWad: unsignedAmountSchema,
    freedChangeWad: signedAmountSchema,
    deadlineSec: unixSecondsSchema,
    call: z.object({ to: addressSchema, data: bytesSchema }).strict(),
  })
  .strict();

export type TickContext = z.infer<typeof tickContextSchema>;
export type MarketContext = z.infer<typeof marketContextSchema>;
export type CompiledTrade = z.infer<typeof compiledTradeSchema>;
export type SpendEntry = z.infer<typeof spendEntrySchema>;
