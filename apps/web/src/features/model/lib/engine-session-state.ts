import type { nodeNameSchema, RunEvent, runResponseSchema } from "@kizashi/schemas/engine";
import type { z } from "zod";

export type RunSnapshot = z.infer<typeof runResponseSchema>;
export type GraphNode = z.infer<typeof nodeNameSchema>;
export type SessionState = {
  snapshot: RunSnapshot | null;
  events: RunEvent[];
  nodes: Partial<Record<GraphNode, "done" | "skipped">>;
  busy: boolean;
  error: string | null;
  streamConnected: boolean;
  stopped: boolean;
};
export const EMPTY_SESSION: SessionState = {
  snapshot: null,
  events: [],
  nodes: {},
  busy: false,
  error: null,
  streamConnected: false,
  stopped: false,
};
type Action =
  | { type: "reset" }
  | { type: "patch"; patch: Partial<SessionState> }
  | { type: "event"; event: RunEvent };
const MAX_VISIBLE_EVENTS = 200;

export function sessionReducer(state: SessionState, action: Action): SessionState {
  if (action.type === "reset") return EMPTY_SESSION;
  if (action.type === "patch") return { ...state, ...action.patch };
  const event = action.event;
  const last = state.events.at(-1);
  if (last && event.seq <= last.seq) return state;
  let nodes = state.nodes;
  // A revision invalidates the previous compile/risk/selection, and each tick starts afresh.
  if (event.type === "node" && event.data.node === "loadContext")
    nodes = {
      ...(nodes.ingestRules ? { ingestRules: nodes.ingestRules } : {}),
      ...(nodes.confirmRules ? { confirmRules: nodes.confirmRules } : {}),
    };
  if (event.type === "node" && event.data.node === "plan") {
    const { compile: _compile, risk: _risk, select: _select, ...prepared } = nodes;
    nodes = prepared;
  }
  if (event.type === "node") nodes = { ...nodes, [event.data.node]: event.data.status };
  return {
    ...state,
    nodes,
    events: [...state.events, event].slice(-MAX_VISIBLE_EVENTS),
    stopped: state.stopped || event.type === "run_stopped",
    error: event.type === "error" ? event.data.message : state.error,
  };
}
