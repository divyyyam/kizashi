import { describe, expect, test } from "bun:test";
import type { HeldPosition, RunMarket, RunRequest } from "../types";
import { activeStep, budgetLeftUsdc, IDLE_RUN, runReducer } from "./run-reducer";

const REQUEST: RunRequest = {
  prompt: "Find cricket markets where the crowd is too wide.",
  rulesFileName: null,
  budgetUsdc: 20_000_000n,
  mode: "suggest",
};

const TEST_MARKET: RunMarket = {
  id: "speed-01",
  tag: "cricket",
  question: "Will the fastest delivery exceed 148 km/h?",
  unit: "km/h",
  threshold: 148,
  domain: { lo: 130, hi: 165 },
  crowd: { mean: 146, sd: 4 },
  closeTimeSec: 1730000000,
};

const TEST_HELD: readonly HeldPosition[] = [
  {
    side: "below",
    threshold: 148,
    stakeUsd: 5,
    price: 0.4,
  },
];

describe("runReducer", () => {
  test("starts running on start action", () => {
    const state = runReducer(IDLE_RUN, { type: "start", request: REQUEST });
    expect(state.status).toBe("running");
    expect(state.request).toEqual(REQUEST);
    expect(state.markets).toHaveLength(0);
    expect(state.steps.rules.status).toBe("pending");
  });

  test("tracks steps through active and done", () => {
    const started = runReducer(IDLE_RUN, { type: "start", request: REQUEST });
    const rulesActive = runReducer(started, {
      type: "event",
      event: { type: "step", step: "rules", status: "active", detail: "Reading constraints" },
    });
    expect(activeStep(rulesActive)).toBe("rules");
    expect(rulesActive.steps.rules).toEqual({ status: "active", detail: "Reading constraints" });

    const rulesDone = runReducer(rulesActive, {
      type: "event",
      event: { type: "step", step: "rules", status: "done" },
    });
    expect(rulesDone.steps.rules).toEqual({ status: "done", detail: "Reading constraints" });
    expect(activeStep(rulesDone)).toBeNull();
  });

  test("records discovered markets, pricing, verdicts, decisions and collateral", () => {
    let state = runReducer(IDLE_RUN, { type: "start", request: REQUEST });
    state = runReducer(state, {
      type: "event",
      event: { type: "market", market: TEST_MARKET },
    });
    expect(state.markets).toHaveLength(1);
    expect(state.markets[0]?.market.id).toBe("speed-01");
    expect(state.markets[0]?.engine).toBeNull();
    expect(state.markets[0]?.verdict).toBeNull();

    state = runReducer(state, {
      type: "event",
      event: { type: "priced", marketId: "speed-01", engine: { mean: 147, sd: 2.5 } },
    });
    expect(state.markets[0]?.engine).toEqual({ mean: 147, sd: 2.5 });

    state = runReducer(state, {
      type: "event",
      event: {
        type: "verdict",
        marketId: "speed-01",
        verdict: { kind: "kept" },
      },
    });
    expect(state.markets[0]?.verdict?.kind).toBe("kept");

    state = runReducer(state, {
      type: "event",
      event: { type: "decision", marketId: "speed-01", stakeUsd: 5 },
    });
    expect(state.decision).toEqual({ marketId: "speed-01", stakeUsd: 5 });

    state = runReducer(state, {
      type: "event",
      event: { type: "collateral", held: TEST_HELD },
    });
    expect(state.held).toEqual(TEST_HELD);

    state = runReducer(state, { type: "event", event: { type: "finished" } });
    expect(state.status).toBe("finished");
  });

  test("ignores events once a run is no longer running", () => {
    const unavailable = runReducer(runReducer(IDLE_RUN, { type: "start", request: REQUEST }), {
      type: "event",
      event: { type: "unavailable", reason: "offline" },
    });
    const after = runReducer(unavailable, { type: "event", event: { type: "finished" } });
    expect(after.status).toBe("unavailable");
  });

  test("placing a bet lowers the budget left and reset restores IDLE_RUN", () => {
    let state = runReducer(IDLE_RUN, { type: "start", request: REQUEST });
    state = runReducer(state, { type: "event", event: { type: "finished" } });
    const placed = runReducer(state, {
      type: "settle",
      settlement: { kind: "placed", shape: "curve", costUsdc: 5_000_000n },
    });
    expect(budgetLeftUsdc(placed)).toBe(15_000_000n);
    expect(placed.settlement).toEqual({
      kind: "placed",
      shape: "curve",
      costUsdc: 5_000_000n,
    });
    expect(budgetLeftUsdc(runReducer(placed, { type: "reset" }))).toBe(0n);
  });

  test("skipping a trade does not deduct from budget left", () => {
    let state = runReducer(IDLE_RUN, { type: "start", request: REQUEST });
    state = runReducer(state, { type: "event", event: { type: "finished" } });
    const skipped = runReducer(state, {
      type: "settle",
      settlement: { kind: "skipped" },
    });
    expect(budgetLeftUsdc(skipped)).toBe(20_000_000n);
    expect(skipped.settlement).toEqual({ kind: "skipped" });
  });
});
