import { z } from "zod";
import {
  approvalNeededSchema,
  approvalResumeSchema,
  txNeededSchema,
  userTxResumeSchema,
} from "./approval";
import { addressSchema, apiVersionSchema, emptyRequestSchema, unixSecondsSchema } from "./common";
import { confirmRulesResumeSchema, pendingRulesSchema } from "./confirmation";
import { modeSchema } from "./graph";

export const runIdParamsSchema = z.object({ id: z.uuid() }).strict();
export const preworkRunSchema = z
  .object({
    runId: z.uuid(),
    user: addressSchema,
    mode: modeSchema,
    status: z.enum(["created", "noop_completed", "rules_pending", "rules_confirmed"]),
    createdAtSec: unixSecondsSchema,
  })
  .strict();
export const runResponseSchema = z
  .object({
    v: apiVersionSchema,
    run: preworkRunSchema,
    pending: z.union([pendingRulesSchema, approvalNeededSchema, txNeededSchema]).nullable(),
  })
  .strict();
export type PreworkRun = z.infer<typeof preworkRunSchema>;
export const readRunEndpointRequestSchema = z
  .object({
    body: z.undefined(),
    query: emptyRequestSchema,
    params: runIdParamsSchema,
  })
  .strict();

export const uploadRulesFieldsSchema = z
  .object({
    v: z.literal("1"),
    mode: modeSchema,
    prompt: z.string().max(2000),
    vault: addressSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.mode === "auto" && !value.vault) {
      context.addIssue({
        code: "custom",
        path: ["vault"],
        message: "A vault is required in auto mode.",
      });
    }
  });
export const createRunResponseSchema = z.object({ v: apiVersionSchema, runId: z.uuid() }).strict();
export const resumeRunResponseSchema = z
  .object({ v: apiVersionSchema, accepted: z.literal(true) })
  .strict();
export const uploadRulesEndpointRequestSchema = z
  .object({
    body: uploadRulesFieldsSchema,
    query: emptyRequestSchema,
    params: emptyRequestSchema,
  })
  .strict();
export const resumeRulesEndpointRequestSchema = z
  .object({
    body: confirmRulesResumeSchema,
    query: emptyRequestSchema,
    params: runIdParamsSchema,
  })
  .strict();

export const resumeEndpointRequestSchema = resumeRulesEndpointRequestSchema.extend({
  body: z.union([confirmRulesResumeSchema, approvalResumeSchema, userTxResumeSchema]),
});
export const tickEndpointRequestSchema = readRunEndpointRequestSchema.extend({
  body: z.object({ v: apiVersionSchema }).strict(),
});
export const modeEndpointRequestSchema = tickEndpointRequestSchema.extend({
  body: z.object({ v: apiVersionSchema, mode: modeSchema }).strict(),
});
export const tickResponseSchema = z.object({ v: apiVersionSchema, accepted: z.boolean() }).strict();
export const modeResponseSchema = z.object({ v: apiVersionSchema, mode: modeSchema }).strict();
export const stopResponseSchema = z
  .object({ v: apiVersionSchema, stopped: z.literal(true) })
  .strict();
