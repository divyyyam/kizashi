import { afterAll, beforeAll, expect, test } from "bun:test";
import {
  errorResponseSchema,
  healthResponseSchema,
  nonceResponseSchema,
  runResponseSchema,
  verifyResponseSchema,
} from "@kizashi/schemas/engine";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";
import { startTestServer, TEST_CHAIN_ID, TEST_WEB_ORIGIN } from "./fixtures/http-server";

let server: Awaited<ReturnType<typeof startTestServer>>;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  if (server) await server.close();
});

test("health is public, validated, and carries a request ID", async () => {
  const response = await server.request("/health");
  expect(response.status).toBe(200);
  expect(healthResponseSchema.parse(await response.json())).toEqual({
    ok: true,
    version: "0.1.0",
    chainId: TEST_CHAIN_ID,
  });
  expect(response.headers.get("x-request-id")).toBeTruthy();
  expect(response.headers.get("x-powered-by")).toBeNull();
});
test("validates query, body version and malformed JSON through one error handler", async () => {
  const query = await server.request("/health?unexpected=true");
  expect(query.status).toBe(400);
  for (const body of [JSON.stringify({ v: 2, message: "invalid", signature: "invalid" }), "{"]) {
    const response = await server.request("/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    expect(response.status).toBe(400);
    expect(errorResponseSchema.parse(await response.json()).error.code).toBe("bad_request");
  }
});
test("oversized JSON returns a validated size error", async () => {
  const response = await server.request("/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "x".repeat(65 * 1024) }),
  });
  expect(response.status).toBe(413);
  expect(errorResponseSchema.parse(await response.json()).error.code).toBe("upload_too_large");
});

test("CORS allows configured origins and rejects others without credentials", async () => {
  const allowed = await server.request("/health", { headers: { Origin: TEST_WEB_ORIGIN } });
  expect(allowed.headers.get("access-control-allow-origin")).toBe(TEST_WEB_ORIGIN);
  expect(allowed.headers.get("access-control-allow-credentials")).toBeNull();
  const rejected = await server.request("/health", {
    headers: { Origin: "http://invalid.example" },
  });
  expect(rejected.status).toBe(403);
  expect(errorResponseSchema.parse(await rejected.json()).error.code).toBe("forbidden");
  const preflight = await server.request("/runs", {
    method: "OPTIONS",
    headers: {
      Origin: TEST_WEB_ORIGIN,
      "Access-Control-Request-Method": "POST",
    },
  });
  expect(preflight.status).toBe(204);
});
test("real EOA signature authenticates through the HTTP routes", async () => {
  const account = privateKeyToAccount(generatePrivateKey());
  const nonce = nonceResponseSchema.parse(await (await server.request("/auth/nonce")).json());
  const message = createSiweMessage({
    address: account.address,
    chainId: TEST_CHAIN_ID,
    domain: "localhost:3000",
    uri: TEST_WEB_ORIGIN,
    version: "1",
    nonce: nonce.nonce,
    issuedAt: new Date(),
  });
  const signature = await account.signMessage({ message });
  const response = await server.request("/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ v: 1, message, signature }),
  });
  expect(response.status).toBe(200);
  const verified = verifyResponseSchema.parse(await response.json());
  expect(verified.address).toBe(account.address);
  expect(await server.tokens.verify(verified.token)).toEqual({
    sub: account.address,
    chainId: TEST_CHAIN_ID,
  });
});
test("no-op run persists ownership; another address receives the same 404 as a missing run", async () => {
  const account = privateKeyToAccount(generatePrivateKey());
  const other = privateKeyToAccount(generatePrivateKey());
  const owner = { sub: account.address, chainId: TEST_CHAIN_ID };
  const run = await server.runs.createNoop(owner);
  const time = Math.floor(Date.now() / 1000);
  const token = await server.tokens.issue(owner, time);
  const response = await server.request(`/runs/${run.runId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status).toBe(200);
  expect(runResponseSchema.parse(await response.json()).run.status).toBe("noop_completed");
  const otherToken = await server.tokens.issue(
    { sub: other.address, chainId: TEST_CHAIN_ID },
    time,
  );
  const headers = { Authorization: `Bearer ${otherToken}` };
  const hidden = await server.request(`/runs/${run.runId}`, { headers });
  const missing = await server.request(`/runs/${crypto.randomUUID()}`, { headers });
  expect(hidden.status).toBe(404);
  expect(missing.status).toBe(404);
  expect(await hidden.json()).toEqual(await missing.json());
  expect((await server.request(`/runs/${run.runId}`)).status).toBe(401);
});
test("run creation is explicitly unavailable until later milestones", async () => {
  const account = privateKeyToAccount(generatePrivateKey());
  const token = await server.tokens.issue(
    { sub: account.address, chainId: TEST_CHAIN_ID },
    Math.floor(Date.now() / 1000),
  );
  const response = await server.request("/runs", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status).toBe(503);
  expect(errorResponseSchema.parse(await response.json()).error.message).toContain("unavailable");
});
