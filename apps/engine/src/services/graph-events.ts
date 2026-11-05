import {
  approvalNeededSchema,
  engineErrorSchema,
  nodeNameSchema,
  pendingRulesSchema,
  pendingTxSchema,
  planOutputSchema,
  type RunEventPayload,
  txNeededSchema,
  verdictSchema,
} from "@kizashi/schemas/engine";
import { z } from "zod";

const updateSchema = z.object({
  tick: z.number().int().nonnegative().optional(),
  pendingTx: pendingTxSchema.nullable().optional(),
  plan: planOutputSchema.nullable().optional(),
  verdicts: z.array(verdictSchema).optional(),
  errors: z.array(engineErrorSchema).optional(),
  outcome: z
    .enum(["hold", "traded", "rejected", "declined", "error", "skipped"])
    .nullable()
    .optional(),
  stop: z
    .enum(["expired", "drawdown", "budget_exhausted", "kill_switch", "all_markets_closed"])
    .nullable()
    .optional(),
});

export function graphEvents(input: unknown, tick: number): RunEventPayload[] {
  const [mode, chunk] = z.tuple([z.enum(["updates", "custom"]), z.unknown()]).parse(input);
  if (mode === "custom")
    return [
      {
        type: "log",
        data: z.object({ tick: z.number().int(), message: z.string() }).strict().parse(chunk),
      },
    ];
  const events: RunEventPayload[] = [];
  for (const [key, value] of Object.entries(z.record(z.string(), z.unknown()).parse(chunk))) {
    if (key === "__interrupt__") {
      for (const item of z.array(z.object({ value: z.unknown() })).parse(value)) {
        const rules = pendingRulesSchema.safeParse(item.value);
        const approval = approvalNeededSchema.safeParse(item.value);
        if (rules.success) events.push({ type: "rules_pending", data: rules.data });
        else if (approval.success) events.push({ type: "approval_needed", data: approval.data });
        else events.push({ type: "tx_needed", data: txNeededSchema.parse(item.value) });
      }
      continue;
    }
    const node = nodeNameSchema.safeParse(key === "planTick" ? "plan" : key);
    if (node.success)
      events.push({ type: "node", data: { node: node.data, tick, status: "done" } });
    const update = updateSchema.parse(value);
    if (update.plan)
      events.push({
        type: "plan",
        data: {
          tick,
          action: update.plan.action,
          candidates: update.plan.action === "trade" ? update.plan.candidates : [],
        },
      });
    if (update.verdicts && key === "risk")
      events.push({ type: "verdicts", data: { tick, items: update.verdicts } });
    if (update.pendingTx) events.push({ type: "tx_pending", data: update.pendingTx });
    for (const error of update.errors ?? []) events.push({ type: "error", data: error });
    if (key === "record" && update.outcome)
      events.push({ type: "tick_ended", data: { tick, outcome: update.outcome } });
    if (update.stop) events.push({ type: "run_stopped", data: { reason: update.stop } });
  }
  return events;
}
