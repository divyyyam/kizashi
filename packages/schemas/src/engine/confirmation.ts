import { z } from "zod";
import { apiVersionSchema, transactionHashSchema } from "./common";
import { ruleSetSchema } from "./rules";

export const pendingRulesSchema = z
  .object({
    ruleSet: ruleSetSchema,
    rulesHash: transactionHashSchema,
    source: z.enum(["json", "pdf"]),
    warnings: z.array(z.string()),
  })
  .strict();

export const confirmRulesResumeSchema = z
  .object({
    v: apiVersionSchema,
    kind: z.literal("confirmRules"),
    rulesHash: z.string().regex(/^0x[\da-fA-F]{64}$/),
    edited: ruleSetSchema.optional(),
  })
  .strict();

export type ConfirmRulesResume = z.infer<typeof confirmRulesResumeSchema>;
