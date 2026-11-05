import { expect, test } from "bun:test";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { createMarketKindService } from "../src/graph/marketKind";
import { coreFixture } from "./fixtures/core";
import { startTestServer } from "./fixtures/http-server";

const body = { v: 1, question: "What is the winning margin?", unit: "runs" };
const suggestion = {
  kind: "expressive",
  lo: "0",
  hi: "64",
  count: 32,
  reason: "Continuous outcome.",
};

async function marketServer(responses = [JSON.stringify(suggestion)]) {
  const server = await startTestServer({
    suggestMarketKind: createMarketKindService(new FakeListChatModel({ responses })),
  });
  const token = await server.tokens.issue(
    { sub: coreFixture().account.address, chainId: 31337 },
    Math.floor(Date.now() / 1000),
  );
  const send = (input: object = body, bearer: string | null = token) =>
    server.request("/market-kind", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify(input),
    });
  return { ...server, send };
}

test("market-kind requires bearer auth and validates requests and responses", async () => {
  const server = await marketServer();
  try {
    expect((await server.send(body, null)).status).toBe(401);
    expect((await server.send({ ...body, v: 2 })).status).toBe(400);
    expect((await server.send({ ...body, unit: "" })).status).toBe(400);
    const response = await server.send();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ v: 1, ...suggestion });
  } finally {
    await server.close();
  }
});

test("market-kind returns a typed LLM failure for invalid structured output", async () => {
  const server = await marketServer(["{}"]);
  try {
    const response = await server.send();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "llm_unavailable" } });
  } finally {
    await server.close();
  }
});

test("market-kind enforces 30 requests per authenticated address per hour", async () => {
  const server = await marketServer();
  try {
    for (let request = 0; request < 30; request++) expect((await server.send()).status).toBe(200);
    const limited = await server.send();
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ error: { code: "rate_limited" } });
    const otherToken = await server.tokens.issue(
      { sub: coreFixture().account.address, chainId: 31337 },
      Math.floor(Date.now() / 1000),
    );
    expect((await server.send(body, otherToken)).status).toBe(200);
  } finally {
    await server.close();
  }
});
