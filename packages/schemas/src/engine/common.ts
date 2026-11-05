import { z } from "zod";

export const apiVersionSchema = z.literal(1);
export const runIdSchema = z.uuid();
export const addressSchema = z.string().regex(/^0x[\da-fA-F]{40}$/);
export const transactionHashSchema = z.string().regex(/^0x[\da-fA-F]{64}$/);
export const unixSecondsSchema = z.number().int().nonnegative();
export const engineErrorCodeSchema = z.enum([
  "unauthorized",
  "forbidden",
  "not_found",
  "rate_limited",
  "bad_request",
  "upload_too_large",
  "unsupported_file",
  "rules_invalid",
  "rules_hash_mismatch",
  "no_pending_interrupt",
  "trade_id_mismatch",
  "tx_mismatch",
  "plan_invalid",
  "llm_unavailable",
  "unknown_market",
  "bad_shape",
  "quote_drift",
  "cap_per_trade",
  "cap_daily",
  "cap_market",
  "cap_budget",
  "market_closed",
  "simulation_reverted",
  "tx_unconfirmed",
  "arkiv_unavailable",
  "vault_unavailable",
  "internal",
]);
export const errorResponseSchema = z
  .object({
    v: apiVersionSchema,
    error: z.object({ code: engineErrorCodeSchema, message: z.string().min(1) }).strict(),
  })
  .strict();
export const healthResponseSchema = z
  .object({
    ok: z.boolean(),
    version: z.string().min(1),
    chainId: z.number().int().positive(),
  })
  .strict();
export const emptyRequestSchema = z.object({}).strict();
export const emptyEndpointRequestSchema = z
  .object({
    body: z.undefined(),
    query: emptyRequestSchema,
    params: emptyRequestSchema,
  })
  .strict();
export type EngineErrorCode = z.infer<typeof engineErrorCodeSchema>;
export type Address = z.infer<typeof addressSchema>;
