import { expect, test } from "bun:test";
import { nodeNameSchema } from "@kizashi/schemas/engine";
import { MemorySaver } from "@langchain/langgraph";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { UnavailableNodeError } from "../src/errors";
import { createEngineGraph, createNoopGraph } from "../src/graph/build";
import { nodeStubs } from "../src/graph/nodes/stubs";
import {
  fixedEdges,
  routeApproval,
  routeGate,
  routePlan,
  routeRisk,
  routeRules,
  routeSelect,
  routeStart,
  routeTransaction,
} from "../src/graph/routes";

const tradeId = crypto.randomUUID();
const transaction = {
  tradeId,
  txHash: `0x${"ab".repeat(32)}`,
  origin: "user" as const,
};

test("1 START unconfirmed → ingestRules → confirmRules; confirmation waits for a tick", () => {
  expect(routeStart({ rulesConfirmed: false })).toBe("ingestRules");
  expect(fixedEdges).toContainEqual(["ingestRules", "confirmRules"]);
  expect(routeRules({ rulesConfirmed: false })).toBe("confirmRules");
  expect(routeRules({ rulesConfirmed: true })).toBe("__end__");
});
test("2 START confirmed → loadContext", () => {
  expect(routeStart({ rulesConfirmed: true })).toBe("loadContext");
});
test("3 loadContext → gate", () => {
  expect(fixedEdges).toContainEqual(["loadContext", "gate"]);
});
test.each([
  "expired",
  "drawdown",
  "budget_exhausted",
  "kill_switch",
  "all_markets_closed",
] as const)("4 gate stopped (%s) → record → END", (stop) => {
  expect(routeGate({ stop })).toBe("record");
  expect(fixedEdges).toContainEqual(["record", "__end__"]);
});
test("5 gate otherwise → plan", () => {
  expect(routeGate({ stop: null })).toBe("plan");
});
test("6 plan hold → record → END", () => {
  expect(routePlan({ plan: { action: "hold", rationale: "No trade requested." } })).toBe("record");
});
test("7 plan trade → compile → risk", () => {
  expect(
    routePlan({ plan: { action: "trade", candidates: [], rationale: "Routing fixture only." } }),
  ).toBe("compile");
  expect(fixedEdges).toContainEqual(["compile", "risk"]);
});
test("8 risk at least one passes → select", () => {
  expect(
    routeRisk({
      verdicts: [
        { passed: false, reasons: ["cap_daily"] },
        { passed: true, reasons: [] },
      ],
      revisions: 1,
    }),
  ).toBe("select");
});
test("9 risk none pass, revisions < 1 → plan", () => {
  expect(routeRisk({ verdicts: [{ passed: false, reasons: ["quote_drift"] }], revisions: 0 })).toBe(
    "plan",
  );
});
test("10 risk none pass, revisions = 1 → record → END", () => {
  expect(routeRisk({ verdicts: [], revisions: 1 })).toBe("record");
});
test("11 select suggest → publishProposal → suggestApproval", () => {
  expect(routeSelect({ mode: "suggest" })).toBe("publishProposal");
  expect(fixedEdges).toContainEqual(["publishProposal", "suggestApproval"]);
});
test("12 select auto → execute", () => {
  expect(routeSelect({ mode: "auto" })).toBe("execute");
});
test("13 suggestApproval approve → awaitUserTx", () => {
  expect(routeApproval({ approval: { tradeId, decision: "approve" } })).toBe("awaitUserTx");
});
test("14 suggestApproval edit → compile", () => {
  expect(routeApproval({ approval: { tradeId, decision: "edit" } })).toBe("compile");
});
test("15 suggestApproval reject → record → END", () => {
  expect(routeApproval({ approval: { tradeId, decision: "reject" } })).toBe("record");
});
test("16 awaitUserTx hash received → confirm", () => {
  expect(routeTransaction({ pendingTx: transaction })).toBe("confirm");
});
test.each(["cancelled", "10-minute timeout"])("17 awaitUserTx %s → record → END", () => {
  expect(routeTransaction({ pendingTx: null })).toBe("record");
});
test("18 execute sent → confirm", () => {
  expect(routeTransaction({ pendingTx: { ...transaction, origin: "engine" } })).toBe("confirm");
});
test("19 execute simulation fails → record → END", () => {
  expect(routeTransaction({ pendingTx: null })).toBe("record");
});
test("20 confirm → record → END", () => {
  expect(fixedEdges).toContainEqual(["confirm", "record"]);
  expect(fixedEdges).toContainEqual(["record", "__end__"]);
});

test("all fixed edges and typed stubs are registered in the E1 graph", async () => {
  const graph = await createEngineGraph(new MemorySaver()).getGraphAsync();
  const edges = graph.edges.map((edge) => [edge.source, edge.target]);
  for (const edge of fixedEdges) expect(edges).toContainEqual([...edge]);
  for (const node of nodeNameSchema.options) {
    expect(graph.nodes[node === "plan" ? "planTick" : node]).toBeDefined();
  }
});

test("no-op graph checkpoints state; all domain nodes remain unavailable", async () => {
  const graph = createNoopGraph(new MemorySaver());
  const account = privateKeyToAccount(generatePrivateKey());
  const runId = crypto.randomUUID();
  const config = { configurable: { thread_id: runId } };
  const state = await graph.invoke(
    { runId, user: account.address, mode: "suggest", vault: null },
    config,
  );
  expect((await graph.getState(config)).values.runId).toBe(runId);
  for (const node of nodeNameSchema.options) {
    await expect(nodeStubs[node](state)).rejects.toBeInstanceOf(UnavailableNodeError);
  }
});
