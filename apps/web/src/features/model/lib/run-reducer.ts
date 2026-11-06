import type {
  EngineRunEvent,
  HeldPosition,
  MarketVerdict,
  RunMarket,
  RunRequest,
  StepId,
  StepStatus,
} from "../types";
import { STEP_IDS } from "../types";
import type { NormalView } from "./normal";
import type { BetShape } from "./pricing";

export type StepState = { readonly status: StepStatus; readonly detail: string | null };

export type MarketEntry = {
  readonly market: RunMarket;
  readonly engine: NormalView | null;
  readonly verdict: MarketVerdict | null;
};

export type Settlement =
  | { readonly kind: "placed"; readonly shape: BetShape; readonly costUsdc: bigint }
  | { readonly kind: "skipped" };

export type RunState = {
  readonly status: "idle" | "running" | "finished" | "unavailable";
  readonly request: RunRequest | null;
  readonly steps: Readonly<Record<StepId, StepState>>;
  readonly markets: readonly MarketEntry[];
  readonly decision: { readonly marketId: string; readonly stakeUsd: number } | null;
  readonly held: readonly HeldPosition[] | null;
  readonly unavailableReason: string | null;
  readonly settlement: Settlement | null;
};

export type RunAction =
  | { readonly type: "start"; readonly request: RunRequest }
  | { readonly type: "event"; readonly event: EngineRunEvent }
  | { readonly type: "settle"; readonly settlement: Settlement }
  | { readonly type: "reset" };

const PENDING: StepState = { status: "pending", detail: null };

export const IDLE_RUN: RunState = {
  status: "idle",
  request: null,
  steps: {
    rules: PENDING,
    markets: PENDING,
    pricing: PENDING,
    cutting: PENDING,
    shape: PENDING,
    collateral: PENDING,
    ready: PENDING,
  },
  markets: [],
  decision: null,
  held: null,
  unavailableReason: null,
  settlement: null,
};

function patchMarket(
  state: RunState,
  marketId: string,
  patch: Partial<Pick<MarketEntry, "engine" | "verdict">>,
): RunState {
  const markets = state.markets.map((entry) =>
    entry.market.id === marketId ? { ...entry, ...patch } : entry,
  );
  return { ...state, markets };
}

function applyEvent(state: RunState, event: EngineRunEvent): RunState {
  switch (event.type) {
    case "step": {
      const previous = state.steps[event.step];
      const detail = event.detail ?? previous.detail;
      return {
        ...state,
        steps: { ...state.steps, [event.step]: { status: event.status, detail } },
      };
    }
    case "market":
      if (state.markets.some((entry) => entry.market.id === event.market.id)) return state;
      return {
        ...state,
        markets: [...state.markets, { market: event.market, engine: null, verdict: null }],
      };
    case "priced":
      return patchMarket(state, event.marketId, { engine: event.engine });
    case "verdict":
      return patchMarket(state, event.marketId, { verdict: event.verdict });
    case "decision":
      return { ...state, decision: { marketId: event.marketId, stakeUsd: event.stakeUsd } };
    case "collateral":
      return { ...state, held: event.held };
    case "unavailable":
      return { ...state, status: "unavailable", unavailableReason: event.reason };
    case "finished":
      return { ...state, status: "finished" };
  }
}

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case "start":
      return { ...IDLE_RUN, status: "running", request: action.request };
    case "event":
      return state.status === "running" ? applyEvent(state, action.event) : state;
    case "settle":
      return state.status === "finished" ? { ...state, settlement: action.settlement } : state;
    case "reset":
      return IDLE_RUN;
  }
}

/** The step the engine is on now, so cards can show the matching animation. */
export function activeStep(state: RunState): StepId | null {
  return STEP_IDS.find((id) => state.steps[id].status === "active") ?? null;
}

/** What the trader still has to spend after anything placed in this run. */
export function budgetLeftUsdc(state: RunState): bigint {
  if (state.request === null) return 0n;
  const spent = state.settlement?.kind === "placed" ? state.settlement.costUsdc : 0n;
  return state.request.budgetUsdc - spent;
}
