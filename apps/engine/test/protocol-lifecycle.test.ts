import { expect, test } from "bun:test";
import { pendingRulesSchema } from "@kizashi/schemas/engine";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { Command, MemorySaver } from "@langchain/langgraph";
import { createCoreGraph } from "../src/graph/core-graph";
import { resetTick } from "../src/graph/nodes/core";
import { graphEvents } from "../src/services/graph-events";
import { rulesHash } from "../src/services/rules-hash";
import { coreFixture } from "./fixtures/core";
import { memoryEffects } from "./fixtures/effects-store";

function protocolFixture() {
  const f = coreFixture();
  const saver = new MemorySaver();
  let loads = 0;
  let proposals = 0;
  const effects = memoryEffects();
  const create = () =>
    createCoreGraph({
      checkpointer: saver,
      effects: effects.store,
      model: new FakeListChatModel({
        responses: [
          JSON.stringify({ action: "trade", rationale: "Test plan", candidates: [f.candidate] }),
        ],
      }),
      adapters: {
        loadContext: async () => {
          loads++;
          return f.context;
        },
        compile: async () => [f.trade],
        publishProposal: async () => {
          proposals++;
          return null;
        },
      },
    });
  const { context: _context, ...input } = f.input;
  return {
    ...f,
    create,
    input: { ...input, rulesConfirmed: false, source: "json" as const, warnings: [] },
    config: { configurable: { thread_id: input.runId }, recursionLimit: 25 },
    loads: () => loads,
    proposals: () => proposals,
  };
}

test("one graph checkpoints intake, edits, confirmation and approval without starting a trade early", async () => {
  const f = protocolFixture();
  const first = f.create();
  await first.invoke(f.input, f.config);
  expect((await first.getState(f.config)).next).toEqual(["confirmRules"]);
  expect(f.loads()).toBe(0);
  const edited = { ...f.rules, notes: "Reviewed strategy notes" };
  await first.invoke(
    new Command({
      resume: { v: 1, kind: "confirmRules", rulesHash: rulesHash(f.rules), edited },
    }),
    f.config,
  );
  const graph = f.create();
  const snapshot = await graph.getState(f.config);
  expect(snapshot.values.rulesHash).toBe(rulesHash(edited));
  expect(snapshot.next).toEqual(["confirmRules"]);
  await graph.invoke(
    new Command({ resume: { v: 1, kind: "confirmRules", rulesHash: rulesHash(edited) } }),
    f.config,
  );
  expect((await graph.getState(f.config)).next).toEqual([]);
  expect(f.loads()).toBe(0);
  await graph.invoke(resetTick(), f.config);
  const restored = await f.create().getState(f.config);
  expect(restored.next).toEqual(["suggestApproval"]);
  expect(restored.values.rulesHash).toBe(rulesHash(edited));
  expect(restored.values.ruleSet).toEqual(edited);
  expect(f.loads()).toBe(1);
  expect(f.proposals()).toBe(1);
});

test("rules intake and confirmation stream through the shared typed event protocol", async () => {
  const f = protocolFixture();
  const graph = f.create();
  const events = [];
  for await (const update of await graph.stream(f.input, {
    ...f.config,
    streamMode: ["updates", "custom"],
  })) {
    events.push(...graphEvents(update, 0));
  }
  expect(events).toContainEqual({
    type: "node",
    data: { node: "ingestRules", tick: 0, status: "done" },
  });
  const pending = events.find((event) => event.type === "rules_pending");
  expect(pending?.data).toEqual(
    pendingRulesSchema.parse({
      ruleSet: f.rules,
      rulesHash: rulesHash(f.rules),
      source: "json",
      warnings: [],
    }),
  );
  expect(events.some((event) => event.type === "plan")).toBe(false);
  for await (const update of await graph.stream(
    new Command({ resume: { v: 1, kind: "confirmRules", rulesHash: rulesHash(f.rules) } }),
    { ...f.config, streamMode: ["updates", "custom"] },
  )) {
    events.push(...graphEvents(update, 0));
  }
  expect(events).toContainEqual({
    type: "node",
    data: { node: "confirmRules", tick: 0, status: "done" },
  });
  expect(events.some((event) => event.type === "tick_ended")).toBe(false);
  expect(f.loads()).toBe(0);
});

test("a stale rules confirmation cannot enter context loading or planning", async () => {
  const f = protocolFixture();
  const graph = f.create();
  await graph.invoke(f.input, f.config);
  await expect(
    graph.invoke(
      new Command({
        resume: {
          v: 1,
          kind: "confirmRules",
          rulesHash: rulesHash({ ...f.rules, notes: "Another version" }),
        },
      }),
      f.config,
    ),
  ).rejects.toMatchObject({ code: "rules_hash_mismatch" });
  expect(f.loads()).toBe(0);
  expect(f.proposals()).toBe(0);
});
