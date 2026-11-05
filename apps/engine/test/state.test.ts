import { expect, test } from "bun:test";
import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createNoopGraph } from "../src/graph/build";
import { engineState } from "../src/graph/state";

test("journal and error history retain only their latest bounded entries", async () => {
  const graph = new StateGraph(engineState)
    .addNode("appendHistory", () => ({
      journal: Array.from({ length: 35 }, (_, tick) => ({
        node: "record" as const,
        tick,
        tSec: tick,
        status: "skipped" as const,
      })),
      errors: Array.from({ length: 25 }, (_, index) => ({
        code: "internal" as const,
        message: `Test failure ${index}`,
        retryable: false,
        node: "record" as const,
      })),
    }))
    .addEdge(START, "appendHistory")
    .addEdge("appendHistory", END)
    .compile();
  const state = await graph.invoke({ runId: crypto.randomUUID() });
  expect(state.journal).toHaveLength(30);
  expect(state.journal[0]?.tick).toBe(5);
  expect(state.errors).toHaveLength(20);
  expect(state.errors[0]?.message).toBe("Test failure 5");
});

test("identity channels cannot change when a checkpointed thread resumes", async () => {
  const graph = createNoopGraph(new MemorySaver());
  const first = privateKeyToAccount(generatePrivateKey());
  const other = privateKeyToAccount(generatePrivateKey());
  const runId = crypto.randomUUID();
  const config = { configurable: { thread_id: runId } };
  await graph.invoke({ runId, user: first.address, vault: null }, config);
  await expect(graph.invoke({ user: other.address }, config)).rejects.toThrow(
    "Graph identity cannot change",
  );
});
