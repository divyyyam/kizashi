import { expect, test } from "bun:test";
import { engineSnapshotSchema } from "@kizashi/schemas/engine";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { Command, MemorySaver } from "@langchain/langgraph";
import { type CoreAdapters, createCoreGraph } from "../src/graph/core-graph";
import { resetTick } from "../src/graph/nodes/core";
import { tradeIdentity } from "../src/services/trade-identity";
import { coreFixture } from "./fixtures/core";

function harness(overrides: Partial<CoreAdapters> = {}) {
  const f = coreFixture();
  let plans = 0;
  const model = new FakeListChatModel({
    responses: [
      JSON.stringify({ action: "trade", rationale: "Test trade", candidates: [f.candidate] }),
    ],
  });
  const saver = new MemorySaver();
  const adapters: CoreAdapters = {
    loadContext: async () => f.context,
    compile: async () => {
      plans++;
      return [f.trade];
    },
    ...overrides,
  };
  const create = () => createCoreGraph({ checkpointer: saver, model, adapters });
  return {
    ...f,
    adapters,
    saver,
    create,
    count: () => plans,
    config: { configurable: { thread_id: f.input.runId }, recursionLimit: 25 },
  };
}

test("the real core reaches approval; restart restores the same trade without recompilation", async () => {
  const f = harness();
  await f.create().invoke(f.input, f.config);
  const graph = f.create();
  const snapshot = await graph.getState(f.config);
  expect(snapshot.next).toEqual(["suggestApproval"]);
  expect(engineSnapshotSchema.parse(snapshot.values).errors.map((item) => item.code)).toContain(
    "arkiv_unavailable",
  );
  expect(snapshot.values.verdicts[0]?.passed).toBe(true);
  const selected = snapshot.values.selected;
  if (!selected) throw new Error("Missing approved trade");
  const tradeId = tradeIdentity({
    runId: f.input.runId,
    tick: 0,
    rulesHash: f.input.rulesHash,
    trade: selected,
    revision: snapshot.values.selectionRevision,
  });
  await graph.invoke(
    new Command({ resume: { v: 1, kind: "approval", decision: "approve", tradeId } }),
    f.config,
  );
  const pending = await graph.getState(f.config);
  expect(pending.next).toEqual(["awaitUserTx"]);
  expect(f.count()).toBe(1);
  await graph.invoke(
    new Command({ resume: { v: 1, kind: "userTx", tradeId, cancelled: true } }),
    f.config,
  );
  expect((await graph.getState(f.config)).values.outcome).toBe("declined");
});

test("edits return through compile/risk and cannot use an earlier approval", async () => {
  const f = harness();
  let compilations = 0;
  f.adapters.compile = async (state) => {
    compilations++;
    const candidate = state.plan?.action === "trade" ? state.plan.candidates[0] : null;
    return [{ ...f.trade, limitUsdc: candidate?.spendUsdc ?? "0" }];
  };
  const graph = f.create();
  await graph.invoke(f.input, f.config);
  const first = (await graph.getState(f.config)).values;
  const trade = first.selected;
  if (!trade) throw new Error("Missing approved trade");
  const tradeId = tradeIdentity({
    runId: first.runId,
    tick: first.tick,
    rulesHash: first.rulesHash,
    trade,
    revision: first.selectionRevision,
  });
  await graph.invoke(
    new Command({
      resume: {
        v: 1,
        kind: "approval",
        decision: "edit",
        tradeId,
        shape: f.candidate.shape,
        spendUsdc: "999999",
      },
    }),
    f.config,
  );
  const final = (await graph.getState(f.config)).values;
  expect(compilations).toBeGreaterThan(1);
  expect(compilations).toBe(3);
  expect(final.revisions).toBe(1);
  expect(final.selected).not.toBeNull();
  const revisedTrade = final.selected;
  if (!revisedTrade) throw new Error("Missing revised trade");
  expect(
    tradeIdentity({
      runId: final.runId,
      tick: final.tick,
      rulesHash: final.rulesHash,
      trade: revisedTrade,
      revision: final.selectionRevision,
    }),
  ).not.toBe(tradeId);
});

test("a risk rejection revises once and never publishes a proposal", async () => {
  let proposals = 0;
  const f = harness({
    publishProposal: async () => {
      proposals++;
      return null;
    },
  });
  f.trade.limitUsdc = "11000000";
  await f.create().invoke(f.input, f.config);
  const state = (await f.create().getState(f.config)).values;
  expect(f.count()).toBe(2);
  expect(state.revisions).toBe(1);
  expect(state.outcome).toBe("rejected");
  expect(proposals).toBe(0);
});

test("two ticks reset pending state and bounded revisions; kill stops the next planner call", async () => {
  const f = harness();
  const graph = f.create();
  f.trade.limitUsdc = "11000000";
  await graph.invoke(f.input, f.config);
  f.context.killSwitch = true;
  await graph.invoke(resetTick(), f.config);
  const state = (await graph.getState(f.config)).values;
  expect(state.tick).toBe(2);
  expect(state.revisions).toBe(0);
  expect(state.selected).toBeNull();
  expect(state.approval).toBeNull();
  expect(state.pendingTx).toBeNull();
  expect(state.stop).toBe("kill_switch");
  expect(f.count()).toBe(2);
});

test("a vault context for another owner fails before planning", async () => {
  const f = harness();
  f.context.positionOwner = coreFixture().account.address;
  await expect(f.create().invoke(f.input, f.config)).rejects.toMatchObject({ code: "forbidden" });
});
