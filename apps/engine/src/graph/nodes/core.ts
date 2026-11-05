import { compiledTradeSchema, tickContextSchema } from "@kizashi/schemas/engine";
import { EngineServiceError } from "../../errors";
import { stopReason } from "../../services/gate";
import { evaluateTrade } from "../../services/risk";
import type { EngineState, EngineUpdate } from "../state";
import type { EngineNode } from "./stubs";

export function requireContext(state: EngineState) {
  if (!state.rulesConfirmed || !state.ruleSet) {
    throw new EngineServiceError("rules_invalid", "Confirm the rules before starting a tick.", 409);
  }
  return tickContextSchema.parse(state.context);
}

const gate: EngineNode = async (state) => ({
  stop: stopReason(requireContext(state), state.ruleSet),
});
const risk: EngineNode = async (state) => {
  const context = requireContext(state);
  if (state.plan?.action !== "trade")
    throw new EngineServiceError("plan_invalid", "No trade plan is available.", 409);
  const candidates = state.plan.candidates;
  const identities = new Set<number>();
  const verdicts = state.compiled.map((value) => {
    const trade = compiledTradeSchema.parse(value);
    const candidate = candidates[trade.candidateIndex];
    if (!candidate || identities.has(trade.candidateIndex)) {
      throw new EngineServiceError(
        "plan_invalid",
        "The compiled candidates do not match the plan.",
        409,
      );
    }
    identities.add(trade.candidateIndex);
    return evaluateTrade({ candidate, trade, context, rules: state.ruleSet });
  });
  return { verdicts };
};

const select: EngineNode = async (state) => {
  const passing = state.verdicts.filter((verdict) => verdict.passed);
  const preferred = passing.find((verdict) => verdict.nets) ?? passing[0];
  const selected = state.compiled.find(
    (trade) => trade.candidateIndex === preferred?.candidateIndex,
  );
  if (!selected)
    throw new EngineServiceError("plan_invalid", "No risk-approved trade is available.", 409);
  return { selected, approval: null, pendingTx: null, proposal: null };
};

const record: EngineNode = async (state) => {
  const context = requireContext(state);
  const outcome =
    state.outcome ?? (state.stop ? "skipped" : state.plan?.action === "hold" ? "hold" : "rejected");
  return {
    outcome,
    tick: state.tick + 1,
    journal: [
      {
        node: "record",
        tick: state.tick,
        tSec: context.nowSec,
        status: "done",
        rulesHash: state.rulesHash,
        message: `${outcome}: ${state.plan?.rationale ?? state.stop ?? "No trade selected."}`,
      },
    ],
  };
};

export const coreNodes = { gate, risk, select, record };

export function resetTick(): EngineUpdate {
  return {
    stop: null,
    plan: null,
    revisions: 0,
    compiled: [],
    verdicts: [],
    selected: null,
    proposal: null,
    approval: null,
    pendingTx: null,
    approvalExpiresAtSec: null,
    outcome: null,
  };
}
