import { z } from "zod";
import { apiVersionSchema, emptyRequestSchema } from "./common";
import { signedAmountSchema } from "./core";

const QUESTION_LENGTH_MIN = 10;
const QUESTION_LENGTH_MAX = 140;
const BUCKET_COUNT_MIN = 2;
const BUCKET_COUNT_MAX = 64;

export const marketKindRequestSchema = z
  .object({
    v: apiVersionSchema,
    question: z.string().trim().min(QUESTION_LENGTH_MIN).max(QUESTION_LENGTH_MAX),
    unit: z.string().trim().min(1),
  })
  .strict();

export const marketKindSuggestionSchema = z
  .object({
    kind: z.enum(["binary", "expressive"]),
    lo: signedAmountSchema,
    hi: signedAmountSchema,
    count: z.number().int().min(BUCKET_COUNT_MIN).max(BUCKET_COUNT_MAX),
    reason: z.string().trim().min(1),
  })
  .strict()
  .refine(
    (value) =>
      BigInt(value.hi) > BigInt(value.lo) &&
      (BigInt(value.hi) - BigInt(value.lo)) % BigInt(value.count) === 0n &&
      (value.kind !== "binary" || value.count === BUCKET_COUNT_MIN),
    "The suggestion must have equal positive-width buckets and two buckets for binary.",
  );

export const marketKindResponseSchema = marketKindSuggestionSchema.safeExtend({
  v: apiVersionSchema,
});
export const marketKindEndpointRequestSchema = z
  .object({
    body: marketKindRequestSchema,
    query: emptyRequestSchema,
    params: emptyRequestSchema,
  })
  .strict();

export type MarketKindRequest = z.infer<typeof marketKindRequestSchema>;
export type MarketKindSuggestion = z.infer<typeof marketKindSuggestionSchema>;
