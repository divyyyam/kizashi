import { expect, test } from "bun:test";
import { errorResponseSchema, runResponseSchema } from "@kizashi/schemas/engine";
import { MemorySaver } from "@langchain/langgraph";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createEngineGraph } from "../src/graph/build";
import { createRulesRuns } from "../src/services/rules-runs";
import { startTestServer, TEST_CHAIN_ID } from "./fixtures/http-server";
import { memoryRulesStore } from "./fixtures/rules-store";

const rules = {
  budgetUsdc: "10000000",
  perTradeCapUsdc: "1000000",
  dailyCapUsdc: "2000000",
  maxLossPerMarketUsdc: "3000000",
  maxDrawdownUsdc: "4000000",
  stopAtSec: 2000000000,
  allowedMarketIds: ["market-a"],
  allowedShapes: ["binary" as const],
  notes: "",
};

function upload() {
  const form = new FormData();
  form.set("v", "1");
  form.set("mode", "suggest");
  form.set("prompt", "Inspect the market.");
  form.set("rules", new Blob([JSON.stringify(rules)], { type: "application/json" }), "rules.json");
  return form;
}

test("upload and hash-bound confirmation survive graph recreation and hide ownership", async () => {
  const store = memoryRulesStore();
  const saver = new MemorySaver();
  const owner = privateKeyToAccount(generatePrivateKey());
  const other = privateKeyToAccount(generatePrivateKey());
  const principal = { sub: owner.address, chainId: TEST_CHAIN_ID };
  const first = await startTestServer({
    rules: createRulesRuns(store, createEngineGraph(saver)),
    extractPdf: async () => rules,
  });
  let runId: string;
  try {
    const token = await first.tokens.issue(principal, Math.floor(Date.now() / 1000));
    const response = await first.request("/runs", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: upload(),
    });
    expect(response.status).toBe(201);
    const body: { runId: string } = await response.json();
    runId = body.runId;
  } finally {
    await first.close();
  }
  const second = await startTestServer({
    rules: createRulesRuns(store, createEngineGraph(saver)),
    extractPdf: async () => rules,
  });
  try {
    const token = await second.tokens.issue(principal, Math.floor(Date.now() / 1000));
    const headers = { Authorization: `Bearer ${token}` };
    const current = runResponseSchema.parse(
      await (await second.request(`/runs/${runId}`, { headers })).json(),
    );
    if (!current.pending || !("ruleSet" in current.pending))
      throw new Error("Expected rules confirmation");
    expect(current.pending.ruleSet).toEqual(rules);
    const otherToken = await second.tokens.issue(
      { sub: other.address, chainId: TEST_CHAIN_ID },
      Math.floor(Date.now() / 1000),
    );
    expect(
      (
        await second.request(`/runs/${runId}`, {
          headers: { Authorization: `Bearer ${otherToken}` },
        })
      ).status,
    ).toBe(404);
    const send = (hash: string) =>
      second.request(`/runs/${runId}/resume`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ v: 1, kind: "confirmRules", rulesHash: hash }),
      });
    const wrong = await send(`0x${"0".repeat(64)}`);
    expect(wrong.status).toBe(409);
    expect(errorResponseSchema.parse(await wrong.json()).error.code).toBe("rules_hash_mismatch");
    const concurrent = await Promise.all([
      send(current.pending.rulesHash),
      send(current.pending.rulesHash),
    ]);
    expect(concurrent.map((response) => response.status).sort()).toEqual([200, 409]);
    expect((await send(current.pending.rulesHash)).status).toBe(409);
  } finally {
    await second.close();
  }
});

test("edited rules require a new hash before confirmation", async () => {
  const server = await startTestServer({
    rules: createRulesRuns(memoryRulesStore(), createEngineGraph(new MemorySaver())),
    extractPdf: async () => rules,
  });
  try {
    const owner = privateKeyToAccount(generatePrivateKey());
    const token = await server.tokens.issue(
      { sub: owner.address, chainId: TEST_CHAIN_ID },
      Math.floor(Date.now() / 1000),
    );
    const headers = { Authorization: `Bearer ${token}` };
    const created = await server.request("/runs", { method: "POST", headers, body: upload() });
    const { runId }: { runId: string } = await created.json();
    const first = runResponseSchema.parse(
      await (await server.request(`/runs/${runId}`, { headers })).json(),
    );
    if (!first.pending || !("rulesHash" in first.pending))
      throw new Error("Expected a pending confirmation.");
    const send = (body: object) =>
      server.request(`/runs/${runId}/resume`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    const edited = { ...rules, budgetUsdc: "11000000" };
    expect(
      (await send({ v: 1, kind: "confirmRules", rulesHash: first.pending.rulesHash, edited }))
        .status,
    ).toBe(200);
    const second = runResponseSchema.parse(
      await (await server.request(`/runs/${runId}`, { headers })).json(),
    );
    if (!second.pending || !("ruleSet" in second.pending))
      throw new Error("Expected revised rules confirmation");
    expect(second.pending.ruleSet).toEqual(edited);
    expect(
      (await send({ v: 1, kind: "confirmRules", rulesHash: first.pending.rulesHash })).status,
    ).toBe(409);
    if (!second.pending) throw new Error("Expected a revised pending confirmation.");
    expect(
      (await send({ v: 1, kind: "confirmRules", rulesHash: second.pending.rulesHash })).status,
    ).toBe(200);
  } finally {
    await server.close();
  }
});

test("rule uploads are limited per authenticated owner", async () => {
  const server = await startTestServer({
    rules: createRulesRuns(memoryRulesStore(), createEngineGraph(new MemorySaver())),
    extractPdf: async () => rules,
  });
  try {
    const owner = privateKeyToAccount(generatePrivateKey());
    const token = await server.tokens.issue(
      { sub: owner.address, chainId: TEST_CHAIN_ID },
      Math.floor(Date.now() / 1000),
    );
    for (let index = 0; index < 5; index++) {
      expect(
        (
          await server.request("/runs", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: upload(),
          })
        ).status,
      ).toBe(201);
    }
    const limited = await server.request("/runs", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: upload(),
    });
    expect(limited.status).toBe(429);
    expect(errorResponseSchema.parse(await limited.json()).error.code).toBe("rate_limited");
  } finally {
    await server.close();
  }
});
