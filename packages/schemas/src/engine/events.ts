import { z } from "zod";
import { approvalNeededSchema, txNeededSchema } from "./approval";
import { apiVersionSchema, transactionHashSchema, unixSecondsSchema } from "./common";
import { pendingRulesSchema } from "./confirmation";
import {
  engineErrorSchema,
  nodeNameSchema,
  planCandidateSchema,
  stopReasonSchema,
  verdictSchema,
} from "./graph";

const tick = z.number().int().nonnegative();
const eventData = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("node"),
      data: z.object({ node: nodeNameSchema, tick, status: z.enum(["done", "skipped"]) }).strict(),
    })
    .strict(),
  z
    .object({ type: z.literal("log"), data: z.object({ tick, message: z.string() }).strict() })
    .strict(),
  z
    .object({
      type: z.literal("rules_pending"),
      data: pendingRulesSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("plan"),
      data: z
        .object({
          tick,
          action: z.enum(["hold", "trade"]),
          candidates: z.array(planCandidateSchema),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("verdicts"),
      data: z.object({ tick, items: z.array(verdictSchema) }).strict(),
    })
    .strict(),
  z.object({ type: z.literal("approval_needed"), data: approvalNeededSchema }).strict(),
  z.object({ type: z.literal("tx_needed"), data: txNeededSchema }).strict(),
  z
    .object({
      type: z.literal("tx_pending"),
      data: z
        .object({
          tradeId: z.string(),
          txHash: transactionHashSchema,
          origin: z.enum(["user", "engine"]),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("executed"),
      data: z
        .object({
          tradeId: z.string(),
          txHash: transactionHashSchema,
          block: z.string().regex(/^(0|[1-9][0-9]*)$/),
          chargeUsdc: z.string().regex(/^(0|-?[1-9][0-9]*)$/),
          freedChangeUsdc: z.string().regex(/^(0|-?[1-9][0-9]*)$/),
          gasUsdc: z.string().regex(/^(0|[1-9][0-9]*)$/),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("tick_ended"),
      data: z
        .object({
          tick,
          outcome: z.enum(["hold", "traded", "rejected", "declined", "error", "skipped"]),
        })
        .strict(),
    })
    .strict(),
  z.object({ type: z.literal("error"), data: engineErrorSchema }).strict(),
  z
    .object({
      type: z.literal("run_stopped"),
      data: z.object({ reason: stopReasonSchema }).strict(),
    })
    .strict(),
  z.object({ type: z.literal("resync"), data: z.object({}).strict() }).strict(),
]);

export const runEventPayloadSchema = eventData;
const envelope = {
  v: apiVersionSchema,
  runId: z.uuid(),
  seq: z.number().int().positive(),
  tSec: unixSecondsSchema,
};
const [firstEvent, ...otherEvents] = eventData.options;
export const runEventSchema = z.discriminatedUnion("type", [
  firstEvent.extend(envelope),
  ...otherEvents.map((schema) => schema.extend(envelope)),
]);
export type RunEventPayload = z.infer<typeof runEventPayloadSchema>;
export type RunEvent = z.infer<typeof runEventSchema>;
