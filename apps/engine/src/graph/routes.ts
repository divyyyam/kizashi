import type { EngineState } from "./state";

const MAX_REVISIONS = 1;

export function routeStart(state: Pick<EngineState, "rulesConfirmed">) {
  return state.rulesConfirmed ? "loadContext" : "ingestRules";
}
export function routeRules(state: Pick<EngineState, "rulesConfirmed">) {
  // Confirmation authorizes rules; a separate on-demand tick requests planning.
  return state.rulesConfirmed ? "__end__" : "confirmRules";
}
export function routeGate(state: Pick<EngineState, "stop">) {
  return state.stop ? "record" : "plan";
}
export function routePlan(state: Pick<EngineState, "plan">) {
  return state.plan?.action === "trade" ? "compile" : "record";
}
export function routeRisk(state: Pick<EngineState, "verdicts" | "revisions">) {
  if (state.verdicts.some((verdict) => verdict.passed)) return "select";
  return state.revisions < MAX_REVISIONS ? "plan" : "record";
}
export function routeSelect(state: Pick<EngineState, "mode">) {
  return state.mode === "suggest" ? "publishProposal" : "execute";
}
export function routeApproval(state: Pick<EngineState, "approval">) {
  if (state.approval?.decision === "approve") return "awaitUserTx";
  return state.approval?.decision === "edit" ? "compile" : "record";
}
export function routeTransaction(state: Pick<EngineState, "pendingTx">) {
  return state.pendingTx ? "confirm" : "record";
}

export const fixedEdges = [
  ["ingestRules", "confirmRules"],
  ["loadContext", "gate"],
  ["compile", "risk"],
  ["publishProposal", "suggestApproval"],
  ["confirm", "record"],
  ["record", "__end__"],
] as const;
