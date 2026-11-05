import { expect, test } from "bun:test";
import type { EngineState } from "../src/graph/state";
import { plannerInput } from "../src/services/planner-input";
import { coreFixture } from "./fixtures/core";

test("planner input carries confirmed rules, exact budgets, chain context and bounded history", () => {
  const f = coreFixture();
  const state: EngineState = {
    ...f.input,
    revisions: 0,
    selectionRevision: 0,
    stop: null,
    plan: null,
    compiled: [],
    verdicts: [{ passed: false, reasons: ["cap_daily"] }],
    selected: null,
    proposal: null,
    approval: null,
    pendingTx: null,
    approvalExpiresAtSec: null,
    outcome: null,
    journal: Array.from({ length: 40 }, (_, tick) => ({
      node: "record",
      tick,
      tSec: f.nowSec,
      status: "done",
    })),
  };
  const input = JSON.parse(plannerInput(state));
  expect(input.rules).toEqual(f.rules);
  expect(input.rulesHash).toBe(f.input.rulesHash);
  expect(input.positionOwner).toBe(f.account.address);
  expect(input.budget.remainingUsdc).toBe("100000000");
  expect(input.journal).toHaveLength(30);
  expect(input.priorVerdicts[0].reasons).toEqual(["cap_daily"]);
  expect(input.markets[0].summary.meanTwiceScaled).toBe("4");
});
