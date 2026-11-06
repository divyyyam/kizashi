import type { NormalView, OutcomeDomain } from "./lib/normal";
import type { BinarySide } from "./lib/pricing";

/** Same values as the engine API's run mode. */
export type EngineMode = "suggest" | "auto";

export type RunRequest = {
  readonly prompt: string;
  readonly rulesFileName: string | null;
  readonly budgetUsdc: bigint;
  readonly mode: EngineMode;
};

export const STEP_IDS = [
  "rules",
  "markets",
  "pricing",
  "cutting",
  "shape",
  "collateral",
  "ready",
] as const;
export type StepId = (typeof STEP_IDS)[number];
export type StepStatus = "pending" | "active" | "done";

/** A market as the engine sees it, with the crowd's view fitted as a normal. */
export type RunMarket = {
  readonly id: string;
  readonly tag: string;
  readonly question: string;
  readonly unit: string;
  readonly closeTimeSec: number;
  readonly domain: OutcomeDomain;
  readonly crowd: NormalView;
  readonly threshold: number;
};

export type RejectReason = "no_edge" | "out_of_scope" | "too_thin" | "too_close";
export type MarketVerdict =
  | { readonly kind: "kept" }
  | { readonly kind: "rejected"; readonly reason: RejectReason };

/** A binary position the trader already holds in the picked market, bought at `price`. */
export type HeldPosition = {
  readonly side: BinarySide;
  readonly threshold: number;
  readonly stakeUsd: number;
  readonly price: number;
};

export type EngineRunEvent =
  | {
      readonly type: "step";
      readonly step: StepId;
      readonly status: "active" | "done";
      readonly detail?: string;
    }
  | { readonly type: "market"; readonly market: RunMarket }
  | { readonly type: "priced"; readonly marketId: string; readonly engine: NormalView }
  | { readonly type: "verdict"; readonly marketId: string; readonly verdict: MarketVerdict }
  | { readonly type: "decision"; readonly marketId: string; readonly stakeUsd: number }
  | { readonly type: "collateral"; readonly held: readonly HeldPosition[] }
  | { readonly type: "unavailable"; readonly reason: string }
  | { readonly type: "finished" };

/** The seam between the page and whatever produces a run. `start` returns a cancel function. */
export type EngineRunAdapter = {
  readonly start: (request: RunRequest, emit: (event: EngineRunEvent) => void) => () => void;
};
