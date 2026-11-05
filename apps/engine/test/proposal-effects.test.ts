import { expect, test } from "bun:test";
import { engineSnapshotSchema } from "@kizashi/schemas/engine";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { Command, MemorySaver } from "@langchain/langgraph";
import { EngineServiceError } from "../src/errors";
import { createCoreGraph, createProposalNode } from "../src/graph/core-graph";
import type { EngineState } from "../src/graph/state";
import { coreFixture } from "./fixtures/core";
import { memoryEffects } from "./fixtures/effects-store";

function proposalFixture() {
  const f = coreFixture();
  const state: EngineState = engineSnapshotSchema.parse({ ...f.input, selectionRevision: 1 });
  const effects = memoryEffects();
  let publications = 0;
  const adapters = {
    loadContext: async () => f.context,
    compile: async () => [f.trade],
    publishProposal: async () => ({
      key: `isolated-proposal-${++publications}`,
      expiresAtSec: f.nowSec + 600,
    }),
  };
  const node = () => createProposalNode(adapters, effects.store);
  const key = `${state.runId}:${state.tick}:${state.selectionRevision}:proposal`;
  return { ...f, state, key, adapters, effects, node, count: () => publications };
}

test("publication happens once per effect key and a recreated node returns the stored reference", async () => {
  const f = proposalFixture();
  const first = await f.node()(f.state);
  expect(first.proposal?.key).toBe("isolated-proposal-1");
  const restarted = memoryEffects();
  for (const [key, value] of f.effects.results) restarted.results.set(key, structuredClone(value));
  const restored = await createProposalNode(f.adapters, restarted.store)(f.state);
  expect(restored.proposal).toEqual(first.proposal);
  expect(await f.node()(f.state)).toEqual(first);
  expect(f.count()).toBe(1);
  expect(f.effects.results.size).toBe(1);
});

test("a reservation without a result never republishes after an ambiguous crash", async () => {
  const f = proposalFixture();
  await f.effects.store.claim(f.state.runId, f.key);
  const result = await f.node()(f.state);
  expect(result.proposal).toBeNull();
  expect(result).toMatchObject({
    errors: [{ code: "arkiv_unavailable" }],
    journal: [{ node: "publishProposal" }],
  });
  expect(f.count()).toBe(0);
});

test("an edit republishes in the same tick under a new selection revision key", async () => {
  const f = proposalFixture();
  const graph = createCoreGraph({
    checkpointer: new MemorySaver(),
    effects: f.effects.store,
    adapters: f.adapters,
    model: new FakeListChatModel({
      responses: [
        JSON.stringify({ action: "trade", rationale: "Test plan", candidates: [f.candidate] }),
      ],
    }),
  });
  const config = { configurable: { thread_id: f.input.runId } };
  await graph.invoke(f.input, config);
  const pending: unknown = (await graph.getState(config)).tasks[0]?.interrupts?.[0]?.value;
  if (!pending || typeof pending !== "object" || !("tradeId" in pending))
    throw new Error("No test approval was produced");
  await graph.invoke(
    new Command({
      resume: {
        v: 1,
        kind: "approval",
        decision: "edit",
        tradeId: pending.tradeId,
        shape: f.candidate.shape,
        spendUsdc: f.candidate.spendUsdc,
      },
    }),
    config,
  );
  const state = (await graph.getState(config)).values;
  expect(state.tick).toBe(0);
  expect(state.selectionRevision).toBe(2);
  expect(state.proposal?.key).toBe("isolated-proposal-2");
  expect(f.effects.results.has(`${f.state.runId}:0:1:proposal`)).toBe(true);
  expect(f.effects.results.has(`${f.state.runId}:0:2:proposal`)).toBe(true);
  expect(f.count()).toBe(2);
});

test("invalid adapter and stored references surface as internal errors instead of Arkiv outages", async () => {
  const f = proposalFixture();
  f.adapters.publishProposal = async () => ({ key: "", expiresAtSec: f.nowSec });
  await expect(f.node()(f.state)).rejects.toMatchObject({ code: "internal", status: 500 });
  f.effects.results.set(f.key, { key: 0 });
  await expect(f.node()(f.state)).rejects.toMatchObject({ code: "internal", status: 500 });
});

test("only publication failures become Arkiv outages and the reserved key is retained", async () => {
  const f = proposalFixture();
  let calls = 0;
  f.adapters.publishProposal = async () => {
    calls++;
    throw new Error("Isolated upstream failure");
  };
  expect(await f.node()(f.state)).toMatchObject({ errors: [{ code: "arkiv_unavailable" }] });
  expect((await f.node()(f.state)).proposal).toBeNull();
  expect(calls).toBe(1);
  expect(f.effects.results.get(f.key)).toBeNull();
});

test("effect storage failures are not swallowed as Arkiv outages", async () => {
  const f = proposalFixture();
  const node = createProposalNode(f.adapters, {
    ...f.effects.store,
    complete: async () => {
      throw new EngineServiceError("internal", "Isolated storage failure", 503);
    },
  });
  await expect(node(f.state)).rejects.toMatchObject({ code: "internal", status: 503 });
  expect(f.count()).toBe(1);
});
