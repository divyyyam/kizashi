import type {
  Address,
  approvalSchema,
  compiledTradeSchema,
  engineErrorSchema,
  executionSchema,
  journalEntrySchema,
  modeSchema,
  pendingTxSchema,
  planOutputSchema,
  proposalRefSchema,
  revisionsSchema,
  ruleSetSchema,
  rulesConfirmedSchema,
  runIdSchema,
  stopReasonSchema,
  tickContextSchema,
  tickSchema,
  verdictSchema,
} from "@kizashi/schemas/engine";
import { Annotation } from "@langchain/langgraph";
import type { z } from "zod";

const EXECUTION_HISTORY_LIMIT = 50;
const JOURNAL_HISTORY_LIMIT = 30;
const ERROR_HISTORY_LIMIT = 20;

function appendRecent<T>(limit: number) {
  return (previous: T[], next: T[]) => [...previous, ...next].slice(-limit);
}

function setOnce<T>(previous: T, next: T): T {
  if (previous !== undefined && previous !== next) {
    throw new Error("Graph identity cannot change within a run.");
  }
  return next;
}

export const engineState = Annotation.Root({
  runId: Annotation<z.infer<typeof runIdSchema>>({ reducer: setOnce }),
  chainId: Annotation<number>({ reducer: setOnce }),
  mode: Annotation<z.infer<typeof modeSchema>>(),
  prompt: Annotation<string>(),
  source: Annotation<"json" | "pdf" | null>({ default: () => null, reducer: (_, next) => next }),
  warnings: Annotation<string[]>({ default: () => [], reducer: (_, next) => next }),
  rulesHash: Annotation<string>(),
  approvalExpiresAtSec: Annotation<number | null>(),
  selectionRevision: Annotation<number>({ default: () => 0, reducer: (_, next) => next }),
  outcome: Annotation<"hold" | "traded" | "rejected" | "declined" | "error" | "skipped" | null>(),
  user: Annotation<Address>({ reducer: setOnce }),
  vault: Annotation<Address | null>({ reducer: setOnce }),
  ruleSet: Annotation<z.infer<typeof ruleSetSchema>>(),
  rulesConfirmed: Annotation<z.infer<typeof rulesConfirmedSchema>>({
    default: () => false,
    reducer: (_, next) => next,
  }),
  tick: Annotation<z.infer<typeof tickSchema>>({ default: () => 0, reducer: (_, next) => next }),
  context: Annotation<z.infer<typeof tickContextSchema>>(),
  stop: Annotation<z.infer<typeof stopReasonSchema> | null>(),
  plan: Annotation<z.infer<typeof planOutputSchema> | null>(),
  revisions: Annotation<z.infer<typeof revisionsSchema>>({
    default: () => 0,
    reducer: (_, next) => next,
  }),
  compiled: Annotation<z.infer<typeof compiledTradeSchema>[]>(),
  verdicts: Annotation<z.infer<typeof verdictSchema>[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  selected: Annotation<z.infer<typeof compiledTradeSchema> | null>(),
  proposal: Annotation<z.infer<typeof proposalRefSchema> | null>(),
  approval: Annotation<z.infer<typeof approvalSchema> | null>(),
  pendingTx: Annotation<z.infer<typeof pendingTxSchema> | null>(),
  executions: Annotation<z.infer<typeof executionSchema>[]>({
    reducer: appendRecent(EXECUTION_HISTORY_LIMIT),
    default: () => [],
  }),
  journal: Annotation<z.infer<typeof journalEntrySchema>[]>({
    reducer: appendRecent(JOURNAL_HISTORY_LIMIT),
    default: () => [],
  }),
  errors: Annotation<z.infer<typeof engineErrorSchema>[]>({
    reducer: appendRecent(ERROR_HISTORY_LIMIT),
    default: () => [],
  }),
});

export type EngineState = typeof engineState.State;
export type EngineUpdate = typeof engineState.Update;
