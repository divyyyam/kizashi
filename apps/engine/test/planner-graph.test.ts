import { expect, test } from "bun:test";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { MemorySaver } from "@langchain/langgraph";
import { createEngineGraph } from "../src/graph/build";
import { coreNodes } from "../src/graph/nodes/core";
import { coreFixture } from "./fixtures/core";

function plannerHarness() {
  const f = coreFixture();
  const tradePlan = JSON.stringify({
    action: "trade",
    rationale: "Allowed by the test rules.",
    candidates: [f.candidate],
  });
  const holdPlan = JSON.stringify({ action: "hold", rationale: "No trade" });
  let evaluations = 0;
  let proposals = 0;
  const run = (responses: string[]) =>
    createEngineGraph(new MemorySaver(), {
      model: new FakeListChatModel({ responses }),
      nodes: {
        ...coreNodes,
        loadContext: async () => ({ context: f.context }),
        compile: async () => ({ compiled: [f.trade] }),
        risk: async (state) => {
          evaluations++;
          return coreNodes.risk(state);
        },
        publishProposal: async () => {
          proposals++;
          return { proposal: null };
        },
        suggestApproval: async () => ({
          approval: { decision: "reject", tradeId: "isolated-planner-test" },
          outcome: "declined",
        }),
      },
    }).invoke(f.input, { configurable: { thread_id: f.input.runId }, recursionLimit: 25 });
  return {
    ...f,
    run,
    tradePlan,
    holdPlan,
    evaluations: () => evaluations,
    proposals: () => proposals,
  };
}

test("the real engine graph records a hold without compiling or evaluating risk", async () => {
  const f = plannerHarness();
  const state = await f.run([f.holdPlan]);
  expect(state.outcome).toBe("hold");
  expect(state.tick).toBe(1);
  expect(f.evaluations()).toBe(0);
  expect(f.proposals()).toBe(0);
});

test("the real engine graph selects a trade only after deterministic risk passes", async () => {
  const f = plannerHarness();
  const state = await f.run([f.tradePlan]);
  expect(state.verdicts[0]?.passed).toBe(true);
  expect(state.selected).toEqual(f.trade);
  expect(state.revisions).toBe(0);
  expect(f.evaluations()).toBe(1);
  expect(f.proposals()).toBe(1);
});

test("the real engine graph revises a rejected plan once, then records rejection", async () => {
  const f = plannerHarness();
  f.trade.limitUsdc = "11000000";
  const state = await f.run([f.tradePlan, f.tradePlan]);
  expect(state.outcome).toBe("rejected");
  expect(state.revisions).toBe(1);
  expect(state.tick).toBe(1);
  expect(f.evaluations()).toBe(2);
  expect(f.proposals()).toBe(0);
});

test("a revised hold ends without another risk evaluation in the real graph", async () => {
  const f = plannerHarness();
  f.trade.limitUsdc = "11000000";
  const state = await f.run([f.tradePlan, f.holdPlan]);
  expect(state.outcome).toBe("hold");
  expect(state.revisions).toBe(1);
  expect(f.evaluations()).toBe(1);
});
