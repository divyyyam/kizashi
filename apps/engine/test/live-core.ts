import { strict as assert } from "node:assert";
import { engineSnapshotSchema } from "@kizashi/schemas/engine";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import pino from "pino";
import { readEnvironment } from "../src/env";
import { createProposalNode } from "../src/graph/core-graph";
import type { EngineState } from "../src/graph/state";
import { createEffectStore } from "../src/services/effects";
import { createRuntime } from "../src/services/runtime";
import { spendTotals } from "../src/services/spend";
import { createTradingRuntime } from "../src/services/trading-runtime";
import { coreFixture } from "./fixtures/core";

const logger = pino({ level: "silent" });
const settings = readEnvironment({
  ...process.env,
  GOOGLE_GENERATIVE_AI_API_KEY: undefined,
  ENGINE_JWT_SECRET: process.env.ENGINE_JWT_SECRET ?? crypto.randomUUID() + crypto.randomUUID(),
});
if (
  settings.NODE_ENV === "production" ||
  !settings.ENGINE_DB_SCHEMA.startsWith("engine_dev_") ||
  !settings.ENGINE_CHECKPOINT_SCHEMA.startsWith("engine_checkpoints_dev_")
) {
  throw new Error("Live core verification requires isolated development schemas.");
}
const fixture = coreFixture();
const nowSec = Math.floor(Date.now() / 1000);
fixture.rules.stopAtSec = nowSec + 3600;
fixture.context.nowSec = nowSec;
fixture.context.chainId = settings.NEXT_PUBLIC_CHAIN_ID;
fixture.trade.chainId = settings.NEXT_PUBLIC_CHAIN_ID;
fixture.trade.deadlineSec = nowSec + 900;
const market = fixture.context.markets[0];
assert(market);
market.closeTimeSec = nowSec + 1800;
const principal = { sub: fixture.account.address, chainId: settings.NEXT_PUBLIC_CHAIN_ID };
let compilations = 0;
let publications = 0;
async function publishFixture(state: EngineState) {
  publications++;
  return {
    key: `isolated-proposal-${state.runId}-${state.selectionRevision}`,
    expiresAtSec: state.approvalExpiresAtSec ?? nowSec + 600,
  };
}

async function verifyEffects(
  runtime: Awaited<ReturnType<typeof createRuntime>>,
  state: EngineState,
) {
  const effects = createEffectStore(runtime.database);
  const node = createProposalNode(
    {
      loadContext: async () => fixture.context,
      compile: async () => [fixture.trade],
      publishProposal: publishFixture,
    },
    effects,
  );
  assert.equal((await node(state)).proposal?.key, state.proposal?.key);
  assert.equal(publications, 1, "Restart must recover the stored proposal without republishing");
  const next = { ...state, selectionRevision: state.selectionRevision + 1 };
  const key = `${state.runId}:${state.tick}:${next.selectionRevision}:proposal`;
  const claims = await Promise.all([
    effects.claim(state.runId, key),
    effects.claim(state.runId, key),
  ]);
  assert.equal(claims.filter((claim) => claim.status === "reserved").length, 1);
  assert.equal((await node(next)).proposal, null);
  assert.equal(publications, 1, "An ambiguous reservation must never republish");
}

function trading(runtime: Awaited<ReturnType<typeof createRuntime>>) {
  return createTradingRuntime({
    database: runtime.database,
    pool: runtime.checkpoints.pool,
    checkpointer: runtime.checkpoints.saver,
    model: new FakeListChatModel({
      responses: [
        JSON.stringify({
          action: "trade",
          rationale: "Isolated verification fixture",
          candidates: [fixture.candidate],
        }),
      ],
    }),
    adapters: {
      loadContext: async () => fixture.context,
      compile: async () => {
        compilations++;
        return [fixture.trade];
      },
      refreshQuote: async () => fixture.trade,
      publishProposal: publishFixture,
    },
  });
}

const first = await createRuntime(settings, logger);
let runId: string;
try {
  const run = await first.rules.start({
    principal,
    mode: "suggest",
    vault: null,
    prompt: "Isolated core verification",
    rules: fixture.rules,
    source: "json",
  });
  runId = run.runId;
  const pending = (await first.rules.read(runId, principal)).pending;
  assert(pending);
  await first.rules.resume(runId, principal, {
    v: 1,
    kind: "confirmRules",
    rulesHash: pending.rulesHash,
  });
  await trading(first).ticks.tick(runId, principal);
} finally {
  await first.close();
}

const restarted = await createRuntime(settings, logger);
try {
  const core = trading(restarted);
  const pending = await core.ticks.pending(runId, principal);
  assert(pending && "trade" in pending);
  assert.equal(compilations, 1, "Restart must not repeat compilation");
  const state = await core.graph.getState({ configurable: { thread_id: runId } });
  await verifyEffects(restarted, engineSnapshotSchema.parse(state.values));
  const reply = { v: 1, kind: "approval", decision: "approve", tradeId: pending.tradeId };
  const approvals = await Promise.allSettled([
    core.ticks.resume(runId, principal, reply),
    core.ticks.resume(runId, principal, reply),
  ]);
  assert.equal(approvals.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(approvals.filter((result) => result.status === "rejected").length, 1);
  assert.equal((await core.spend.read(runId)).length, 1);
  assert.equal((await core.ticks.pending(runId, principal))?.tradeId, pending.tradeId);
  await core.spend.submitted({
    runId,
    tradeId: pending.tradeId,
    txHash: `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex")}`,
  });
  const sent = (await core.spend.read(runId))[0];
  assert(sent);
  assert.equal(sent.status, "sent");
  assert.equal(spendTotals([sent], nowSec + 86401).dailyUsdc, BigInt(sent.spendUsdc));
  await assert.rejects(core.spend.transition(runId, sent, "expired"));
  const appended = await Promise.all(
    Array.from({ length: 4 }, () =>
      restarted.events.append(runId, {
        type: "log",
        data: { tick: 0, message: "Isolated sequence verification" },
      }),
    ),
  );
  assert.equal(new Set(appended.map((event) => event.seq)).size, 4);
  const history = await restarted.events.since(runId, 0);
  assert(history.events.some((event) => event.type === "approval_needed"));
  assert(history.events.some((event) => event.type === "tx_needed"));
  await restarted.control.stop(runId, principal);
  await assert.rejects(core.ticks.tick(runId, principal));
  process.stdout.write(
    "PASS: live Postgres approval restart, stored proposal replay, atomic effect reservations, serialized resumes, durable spend, unresolved broadcast accounting, unique event sequences and persisted stop. No chain, Arkiv or LLM calls.\n",
  );
} finally {
  await restarted.close();
}
