import {
  type ConfirmRulesResume,
  type Principal,
  preworkRunSchema,
  type RuleSet,
} from "@kizashi/schemas/engine";
import { Command } from "@langchain/langgraph";
import { EngineServiceError } from "../errors";
import type { createEngineGraph } from "../graph/build";
import { graphEvents } from "./graph-events";
import { rulesHash } from "./rules-hash";
import type { PersistRules, RulesStore } from "./rules-store";
import type { RunEvents } from "./run-events";

const MILLISECONDS_PER_SECOND = 1000;
type Graph = ReturnType<typeof createEngineGraph>;
type RuleInput = {
  principal: Principal;
  mode: "suggest" | "auto";
  vault: Principal["sub"] | null;
  prompt: string;
  rules: RuleSet;
  source: "json" | "pdf";
};

function rulesSession(store: RulesStore, graph: Graph, events?: Pick<RunEvents, "append">) {
  const config = (runId: string) => ({ configurable: { thread_id: runId }, recursionLimit: 25 });
  async function sync(runId: string, persist: PersistRules) {
    const snapshot = await graph.getState(config(runId));
    const state = snapshot.values;
    if (state.ruleSet)
      await persist({
        runId,
        hash: rulesHash(state.ruleSet),
        rules: state.ruleSet,
        source: state.source,
        confirmed: state.rulesConfirmed,
      });
    return snapshot;
  }
  async function find(runId: string, principal: Principal) {
    const run = await store.findOwned(runId, principal);
    if (!run) throw new EngineServiceError("not_found", "The run was not found.", 404);
    return run;
  }
  async function stream(runId: string, input: Parameters<Graph["stream"]>[0]) {
    for await (const update of await graph.stream(input, {
      ...config(runId),
      streamMode: ["updates", "custom"],
    })) {
      for (const event of graphEvents(update, 0)) await events?.append(runId, event);
    }
  }
  return { store, graph, config, sync, find, stream };
}
type Session = ReturnType<typeof rulesSession>;

async function startRules(session: Session, input: RuleInput) {
  const run = await session.store.create(input.principal, input.mode);
  await session.store.withLock(run.id, async (persist) => {
    await session.stream(run.id, {
      runId: run.id,
      chainId: input.principal.chainId,
      user: input.principal.sub,
      mode: input.mode,
      vault: input.vault,
      prompt: input.prompt,
      ruleSet: input.rules,
      source: input.source,
      warnings: [],
      rulesConfirmed: false,
    });
    await session.sync(run.id, persist);
  });
  return { v: 1 as const, runId: run.id };
}

async function readRules(session: Session, input: { runId: string; principal: Principal }) {
  const { runId, principal } = input;
  const run = await session.find(runId, principal);
  // A confirmed rules view delegates trade interrupts to the tick coordinator.
  const state = ["noop_completed", "rules_confirmed"].includes(run.status)
    ? null
    : await session.graph.getState(session.config(runId));
  const pending = state?.next.includes("confirmRules")
    ? {
        ruleSet: state.values.ruleSet,
        rulesHash: rulesHash(state.values.ruleSet),
        source: state.values.source,
        warnings: state.values.warnings,
      }
    : null;
  const status = state?.values.ruleSet
    ? state.values.rulesConfirmed
      ? "rules_confirmed"
      : "rules_pending"
    : run.status;
  return {
    v: 1 as const,
    run: preworkRunSchema.parse({
      runId: run.id,
      user: run.owner,
      mode: run.mode,
      status,
      createdAtSec: Math.floor(run.createdAt.getTime() / MILLISECONDS_PER_SECOND),
    }),
    pending,
  };
}

async function resumeRules(
  session: Session,
  options: { runId: string; principal: Principal; input: ConfirmRulesResume },
) {
  const { runId, principal, input } = options;
  const run = await session.find(runId, principal);
  if (run.status === "rules_confirmed")
    throw new EngineServiceError("no_pending_interrupt", "The rules are already confirmed.", 409);
  const result = await session.store.withLock(runId, async (persist) => {
    const snapshot = await session.sync(runId, persist);
    if (!snapshot.next.includes("confirmRules"))
      return new EngineServiceError(
        "no_pending_interrupt",
        "No rules confirmation is pending.",
        409,
      );
    if (rulesHash(snapshot.values.ruleSet).toLowerCase() !== input.rulesHash.toLowerCase()) {
      return new EngineServiceError(
        "rules_hash_mismatch",
        "The rules have changed; review them again.",
        409,
      );
    }
    await session.stream(runId, new Command({ resume: input }));
    await session.sync(runId, persist);
    return { v: 1 as const, accepted: true as const };
  });
  if (result instanceof EngineServiceError) throw result;
  return result;
}

export function createRulesRuns(
  store: RulesStore,
  graph: Graph,
  events?: Pick<RunEvents, "append">,
) {
  const session = rulesSession(store, graph, events);
  return {
    start: (input: RuleInput) => startRules(session, input),
    read: (runId: string, principal: Principal) => readRules(session, { runId, principal }),
    resume: (runId: string, principal: Principal, input: ConfirmRulesResume) =>
      resumeRules(session, { runId, principal, input }),
  };
}
export type RulesRuns = ReturnType<typeof createRulesRuns>;
