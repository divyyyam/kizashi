import { strict as assert } from "node:assert";
import {
  nonceResponseSchema,
  runResponseSchema,
  verifyResponseSchema,
} from "@kizashi/schemas/engine";
import pino from "pino";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";
import { readEnvironment } from "../src/env";
import { createRuntime } from "../src/services/runtime";

const REQUEST_TIMEOUT_MS = 15_000;
const JWT_SECRET_BYTES = 32;
const logger = pino({ level: "silent" });
const settings = readEnvironment({
  ...process.env,
  ENGINE_JWT_SECRET:
    process.env.ENGINE_JWT_SECRET ??
    Buffer.from(crypto.getRandomValues(new Uint8Array(JWT_SECRET_BYTES))).toString("hex"),
});

async function signIn(request: (path: string, options?: RequestInit) => Promise<Response>) {
  const account = privateKeyToAccount(generatePrivateKey());
  const nonceResponse = await request("/auth/nonce");
  assert.equal(nonceResponse.status, 200, "The live nonce endpoint must succeed.");
  const nonce = nonceResponseSchema.parse(await nonceResponse.json());
  const origin = settings.ENGINE_ALLOWED_ORIGINS.find(
    (value) => new URL(value).host === settings.ENGINE_SIWE_DOMAIN,
  );
  if (!origin) throw new Error("No origin matches the configured SIWE domain.");
  const message = createSiweMessage({
    address: account.address,
    chainId: settings.NEXT_PUBLIC_CHAIN_ID,
    domain: settings.ENGINE_SIWE_DOMAIN,
    uri: origin,
    version: "1",
    nonce: nonce.nonce,
    issuedAt: new Date(),
  });
  const signature = await account.signMessage({ message });
  const response = await request("/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ v: 1, message, signature }),
  });
  assert.equal(response.status, 200);
  return verifyResponseSchema.parse(await response.json());
}

async function verifyHttp(runtime: Awaited<ReturnType<typeof createRuntime>>) {
  const server = runtime.app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  try {
    const address = server.address();
    assert(address && typeof address !== "string");
    const request = (path: string, options: RequestInit = {}) =>
      fetch(`http://127.0.0.1:${address.port}${path}`, {
        ...options,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    assert.equal((await request("/health")).status, 200);
    const owner = await signIn(request);
    const run = await runtime.runs.createNoop({ sub: owner.address, chainId: owner.chainId });
    const headers = { Authorization: `Bearer ${owner.token}` };
    const response = await request(`/runs/${run.runId}`, { headers });
    assert.equal(runResponseSchema.parse(await response.json()).run.status, "noop_completed");
    const other = await signIn(request);
    assert.equal(
      (await request(`/runs/${run.runId}`, { headers: { Authorization: `Bearer ${other.token}` } }))
        .status,
      404,
    );
    return run.runId;
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
  }
}

const runtime = await createRuntime(settings, logger);
let runId: string;
let rulesRunId: string;
const rulesOwner = {
  sub: privateKeyToAccount(generatePrivateKey()).address,
  chainId: settings.NEXT_PUBLIC_CHAIN_ID,
};
const rules = {
  budgetUsdc: "10000000",
  perTradeCapUsdc: "1000000",
  dailyCapUsdc: "2000000",
  maxLossPerMarketUsdc: "3000000",
  maxDrawdownUsdc: "4000000",
  stopAtSec: 2000000000,
  allowedMarketIds: ["test-market"],
  allowedShapes: ["binary" as const],
  notes: "",
};
try {
  runId = await verifyHttp(runtime);
  const started = await runtime.rules.start({
    principal: rulesOwner,
    mode: "suggest",
    vault: null,
    prompt: "Check the rules.",
    rules,
    source: "json",
  });
  rulesRunId = started.runId;
} finally {
  await runtime.close();
}
const restarted = await createRuntime(settings, logger);
try {
  const state = await restarted.graph.getState({ configurable: { thread_id: runId } });
  assert.equal(state.values.runId, runId);
  const pending = await restarted.rules.read(rulesRunId, rulesOwner);
  assert(pending.pending);
  await assert.rejects(
    restarted.rules.resume(rulesRunId, rulesOwner, {
      v: 1,
      kind: "confirmRules",
      rulesHash: `0x${"0".repeat(64)}`,
    }),
    (error: unknown) =>
      error instanceof Error && "code" in error && error.code === "rules_hash_mismatch",
  );
  await restarted.rules.resume(rulesRunId, rulesOwner, {
    v: 1,
    kind: "confirmRules",
    rulesHash: pending.pending.rulesHash,
  });
  assert.equal((await restarted.rules.read(rulesRunId, rulesOwner)).run.status, "rules_confirmed");
  process.stdout.write(
    "PASS: live health, SIWE, owner isolation, pooled app tables, durable rules confirmation and direct Postgres restart persistence.\n",
  );
} finally {
  await restarted.close();
}
