import { z } from "zod";
import { engineErrorCodeSchema, transactionHashSchema, unixSecondsSchema } from "./common";

export const modeSchema = z.enum(["suggest", "auto"]);
export const rulesConfirmedSchema = z.boolean();
export const tickSchema = z.number().int().nonnegative();
export const revisionsSchema = z.number().int().min(0).max(1);
export const stopReasonSchema = z.enum([
  "expired",
  "drawdown",
  "budget_exhausted",
  "kill_switch",
  "all_markets_closed",
]);

export { compiledTradeSchema, tickContextSchema } from "./core";
export { ruleSetSchema } from "./rules";
export const executionSchema = z.never();
const coordinateSchema = z.string().regex(/^-?(0|[1-9][0-9]*)$/);
export const shapeSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("binary"),
      threshold: coordinateSchema,
      side: z.enum(["above", "below"]),
      precision: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("curve"),
      mean: coordinateSchema,
      width: coordinateSchema,
      precision: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("range"),
      from: coordinateSchema,
      to: coordinateSchema,
      precision: z.number().int().nonnegative(),
    })
    .strict(),
]);
export const planCandidateSchema = z
  .object({
    marketId: z.string().min(1),
    shape: shapeSchema,
    spendUsdc: z.string().regex(/^[1-9][0-9]*$/),
    rationale: z.string().min(1),
    ruleRefs: z.array(z.string().min(1)),
  })
  .strict();
export const planOutputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("hold"), rationale: z.string() }).strict(),
  z
    .object({
      action: z.literal("trade"),
      candidates: z.array(planCandidateSchema).min(1).max(3),
      rationale: z.string(),
    })
    .strict(),
]);
export const verdictSchema = z
  .object({
    passed: z.boolean(),
    reasons: z.array(engineErrorCodeSchema),
    candidateIndex: z.number().int().min(0).max(2).optional(),
    nets: z.boolean().optional(),
  })
  .strict();
export const proposalRefSchema = z
  .object({
    key: z.string().min(1),
    expiresAtSec: unixSecondsSchema,
  })
  .strict();
export const approvalSchema = z
  .object({
    tradeId: z.string().min(1),
    decision: z.enum(["approve", "edit", "reject"]),
    shape: shapeSchema.optional(),
    spendUsdc: z
      .string()
      .regex(/^[1-9][0-9]*$/)
      .optional(),
  })
  .strict();
export const pendingTxSchema = z
  .object({
    tradeId: z.string().min(1),
    txHash: transactionHashSchema,
    origin: z.enum(["user", "engine"]),
  })
  .strict();
export const nodeNameSchema = z.enum([
  "ingestRules",
  "confirmRules",
  "loadContext",
  "gate",
  "plan",
  "compile",
  "risk",
  "select",
  "publishProposal",
  "suggestApproval",
  "awaitUserTx",
  "execute",
  "confirm",
  "record",
]);
export const journalEntrySchema = z
  .object({
    rulesHash: z
      .string()
      .regex(/^0x[\da-fA-F]{64}$/)
      .optional(),
    message: z.string().optional(),
    node: nodeNameSchema,
    tick: z.number().int().nonnegative(),
    tSec: unixSecondsSchema,
    status: z.enum(["done", "skipped"]),
  })
  .strict();
export const engineErrorSchema = z
  .object({
    code: engineErrorCodeSchema,
    message: z.string().min(1),
    retryable: z.boolean(),
    node: nodeNameSchema.nullable(),
  })
  .strict();
export type EngineMode = z.infer<typeof modeSchema>;
export type NodeName = z.infer<typeof nodeNameSchema>;
export type ProposalRef = z.infer<typeof proposalRefSchema>;
