import { z } from "zod";
import { addressSchema, transactionHashSchema, unixSecondsSchema } from "./common";
import { compiledTradeSchema, tickContextSchema } from "./core";
import {
  approvalSchema,
  engineErrorSchema,
  journalEntrySchema,
  modeSchema,
  pendingTxSchema,
  planOutputSchema,
  proposalRefSchema,
  revisionsSchema,
  stopReasonSchema,
  tickSchema,
  verdictSchema,
} from "./graph";
import { ruleSetSchema } from "./rules";

export const engineSnapshotSchema = z.object({
  runId: z.uuid(),
  chainId: z.number().int().positive(),
  user: addressSchema,
  mode: modeSchema,
  vault: addressSchema.nullable(),
  prompt: z.string(),
  source: z.enum(["json", "pdf"]).nullable().default(null),
  warnings: z.array(z.string()).default([]),
  ruleSet: ruleSetSchema,
  rulesHash: transactionHashSchema,
  rulesConfirmed: z.literal(true),
  tick: tickSchema,
  context: tickContextSchema,
  stop: stopReasonSchema.nullable().default(null),
  plan: planOutputSchema.nullable().default(null),
  revisions: revisionsSchema.default(0),
  compiled: z.array(compiledTradeSchema).default([]),
  verdicts: z.array(verdictSchema).default([]),
  selected: compiledTradeSchema.nullable().default(null),
  proposal: proposalRefSchema.nullable().default(null),
  approval: approvalSchema.nullable().default(null),
  pendingTx: pendingTxSchema.nullable().default(null),
  approvalExpiresAtSec: unixSecondsSchema.nullable().default(null),
  selectionRevision: z.number().int().nonnegative().default(0),
  outcome: z
    .enum(["hold", "traded", "rejected", "declined", "error", "skipped"])
    .nullable()
    .default(null),
  executions: z.array(z.never()).default([]),
  journal: z.array(journalEntrySchema).default([]),
  errors: z.array(engineErrorSchema).default([]),
});
