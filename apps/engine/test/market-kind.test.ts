import { expect, spyOn, test } from "bun:test";
import { marketKindResponseSchema } from "@kizashi/schemas/engine";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { createMarketKindGraph, createMarketKindService } from "../src/graph/marketKind";

const request = { v: 1 as const, question: "What is the winning margin?", unit: "runs" };
const suggestion = {
  kind: "expressive" as const,
  lo: "0",
  hi: "64",
  count: 32,
  reason: "Continuous outcome.",
};

test("the creator graph has one node, no interrupts, and validates structured model output", async () => {
  const model = new FakeListChatModel({ responses: [JSON.stringify(suggestion)] });
  const calls = spyOn(model, "_generate");
  const graph = createMarketKindGraph(model);
  const nodes = Object.keys((await graph.getGraphAsync()).nodes);
  expect(nodes.filter((node) => !node.startsWith("__"))).toEqual(["suggestKind"]);
  const state = await graph.invoke({ request });
  expect(state.suggestion).toEqual(suggestion);
  expect(calls).toHaveBeenCalledTimes(1);
  expect("__interrupt__" in state).toBe(false);
  calls.mockRestore();
});

test("market-kind service returns the versioned response without a run", async () => {
  const model = new FakeListChatModel({ responses: [JSON.stringify(suggestion)] });
  expect(await createMarketKindService(model)(request)).toEqual(
    marketKindResponseSchema.parse({ v: 1, ...suggestion }),
  );
});

test("schema-invalid model output is retried once, then fails without a guessed grid", async () => {
  const model = new FakeListChatModel({ responses: [JSON.stringify({ ...suggestion, hi: "0" })] });
  const calls = spyOn(model, "_generate");
  await expect(createMarketKindGraph(model).invoke({ request })).rejects.toMatchObject({
    code: "llm_unavailable",
    status: 503,
  });
  expect(calls).toHaveBeenCalledTimes(2);
  calls.mockRestore();
});

test("a stalled fake model hits each deadline and returns llm_unavailable after one retry", async () => {
  const model = new FakeListChatModel({ responses: [JSON.stringify(suggestion)], sleep: 100 });
  const calls = spyOn(model, "_generate");
  const TEST_TIMEOUT_MS = 5;
  await expect(
    createMarketKindGraph(model, TEST_TIMEOUT_MS).invoke({ request }),
  ).rejects.toMatchObject({
    code: "llm_unavailable",
    status: 503,
  });
  expect(calls).toHaveBeenCalledTimes(2);
  calls.mockRestore();
});

test("suggestion validation rejects mismatched kinds, grid widths and API versions", () => {
  for (const invalid of [
    { kind: "binary", count: 32 },
    { hi: "63" },
    { count: 65 },
    { v: 2 },
    { reason: "" },
  ]) {
    expect(marketKindResponseSchema.safeParse({ v: 1, ...suggestion, ...invalid }).success).toBe(
      false,
    );
  }
});
