import { z } from "zod";
import {
  addressSchema,
  apiVersionSchema,
  transactionHashSchema,
  unixSecondsSchema,
} from "./common";
import { compiledTradeSchema } from "./core";
import { shapeSchema, verdictSchema } from "./graph";

const identity = { v: apiVersionSchema, tradeId: z.string().min(1) };
export const approvalResumeSchema = z.discriminatedUnion("decision", [
  z.object({ ...identity, kind: z.literal("approval"), decision: z.literal("approve") }).strict(),
  z.object({ ...identity, kind: z.literal("approval"), decision: z.literal("reject") }).strict(),
  z
    .object({
      ...identity,
      kind: z.literal("approval"),
      decision: z.literal("edit"),
      shape: shapeSchema,
      spendUsdc: z.string().regex(/^[1-9][0-9]*$/),
    })
    .strict(),
]);
export const userTxResumeSchema = z.union([
  z.object({ ...identity, kind: z.literal("userTx"), txHash: transactionHashSchema }).strict(),
  z.object({ ...identity, kind: z.literal("userTx"), cancelled: z.literal(true) }).strict(),
]);
export type ApprovalResume = z.infer<typeof approvalResumeSchema>;
export type UserTxResume = z.infer<typeof userTxResumeSchema>;

export const approvalNeededSchema = z
  .object({
    tick: z.number().int().nonnegative(),
    tradeId: z.string().min(1),
    trade: compiledTradeSchema.omit({ call: true }),
    verdict: verdictSchema,
    rationale: z.string(),
    proposalKey: z.string().nullable(),
    expiresAtSec: unixSecondsSchema,
  })
  .strict();
export const txNeededSchema = z
  .object({
    tradeId: z.string().min(1),
    to: addressSchema,
    data: z.string().regex(/^0x(?:[\da-fA-F]{2})*$/),
    valueUsdc: z.literal("0"),
    expiresAtSec: unixSecondsSchema,
  })
  .strict();
