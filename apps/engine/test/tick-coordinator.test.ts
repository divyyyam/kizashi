import { expect, test } from "bun:test";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { MemorySaver } from "@langchain/langgraph";
import { EngineServiceError } from "../src/errors";
import { createNoopGraph } from "../src/graph/build";
import { createCoreGraph } from "../src/graph/core-graph";
import { createTickCoordinator, type TickPorts } from "../src/services/tick-coordinator";
import { coreFixture } from "./fixtures/core";

async function harness() {
  const f = coreFixture();
  const saver = new MemorySaver();
  const config = { configurable: { thread_id: f.input.runId } };
  await createNoopGraph(saver).invoke(f.input, config);
  const graph = createCoreGraph({
    checkpointer: saver,
    model: new FakeListChatModel({
      responses: [
        JSON.stringify({ action: "trade", rationale: "Test", candidates: [f.candidate] }),
      ],
    }),
    adapters: { loadContext: async () => f.context, compile: async () => [f.trade] },
  });
  let locked = false,
    stopped = false,
    guarded = 0,
    released = 0;
  const ports: TickPorts = {
    graph,
    nowSec: () => f.nowSec,
    findOwned: async (id, principal) =>
      id === f.input.runId && principal.sub === f.account.address
        ? { mode: "suggest", stopped }
        : null,
    lock: async (_id, action) => {
      if (locked) throw new EngineServiceError("no_pending_interrupt", "Already running", 409);
      locked = true;
      try {
        return await action();
      } finally {
        locked = false;
      }
    },
    beforeSignature: async () => {
      guarded++;
    },
    acceptTransaction: async () => {
      throw new Error("No test transaction verifier configured");
    },
    releaseReservation: async () => {
      released++;
    },
    refreshContext: async () => f.context,
    onUpdate: async () => {},
  };
  const principal = { sub: f.account.address, chainId: 31337 };
  return {
    ...f,
    ports,
    principal,
    coordinator: createTickCoordinator(ports),
    stop: () => {
      stopped = true;
    },
    counts: () => ({ guarded, released }),
  };
}

test("tick coordination skips an open interrupt and restores the pending card", async () => {
  const f = await harness();
  expect(await f.coordinator.tick(f.input.runId, f.principal)).toEqual({ v: 1, accepted: true });
  expect(await f.coordinator.tick(f.input.runId, f.principal)).toEqual({ v: 1, accepted: false });
  const pending = await f.coordinator.pending(f.input.runId, f.principal);
  expect(pending && "trade" in pending).toBe(true);
});

test("concurrent ticks cannot both enter the graph", async () => {
  const f = await harness();
  const results = await Promise.allSettled([
    f.coordinator.tick(f.input.runId, f.principal),
    f.coordinator.tick(f.input.runId, f.principal),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
});

test("approval revalidates once; stale and mismatched resumes cannot reveal calldata", async () => {
  const f = await harness();
  await f.coordinator.tick(f.input.runId, f.principal);
  const pending = await f.coordinator.pending(f.input.runId, f.principal);
  if (!pending || !("trade" in pending)) throw new Error("No approval card");
  const reply = { v: 1, kind: "approval", decision: "approve", tradeId: pending.tradeId };
  await expect(
    f.coordinator.resume(f.input.runId, f.principal, { ...reply, tradeId: "wrong" }),
  ).rejects.toMatchObject({ code: "trade_id_mismatch" });
  expect(f.counts().guarded).toBe(0);
  await f.coordinator.resume(f.input.runId, f.principal, reply);
  expect(f.counts().guarded).toBe(1);
  await expect(f.coordinator.resume(f.input.runId, f.principal, reply)).rejects.toMatchObject({
    code: "no_pending_interrupt",
  });
  expect(f.counts().guarded).toBe(1);
  expect(await f.coordinator.pending(f.input.runId, f.principal)).toHaveProperty("data");
});

test("expiry releases the reservation and clears the interrupt durably", async () => {
  const f = await harness();
  await f.coordinator.tick(f.input.runId, f.principal);
  const pending = await f.coordinator.pending(f.input.runId, f.principal);
  if (!pending) throw new Error("No approval");
  f.ports.nowSec = () => pending.expiresAtSec;
  await expect(
    f.coordinator.resume(f.input.runId, f.principal, {
      v: 1,
      kind: "approval",
      decision: "approve",
      tradeId: pending.tradeId,
    }),
  ).rejects.toMatchObject({ code: "no_pending_interrupt" });
  expect(f.counts()).toEqual({ guarded: 0, released: 1 });
  expect(await f.coordinator.pending(f.input.runId, f.principal)).toBeNull();
});

test("stop blocks new ticks and approvals while ownership stays hidden", async () => {
  const f = await harness();
  await f.coordinator.tick(f.input.runId, f.principal);
  const pending = await f.coordinator.pending(f.input.runId, f.principal);
  if (!pending) throw new Error("No approval");
  f.stop();
  await expect(f.coordinator.tick(f.input.runId, f.principal)).rejects.toMatchObject({
    code: "no_pending_interrupt",
  });
  await expect(
    f.coordinator.resume(f.input.runId, f.principal, {
      v: 1,
      kind: "approval",
      decision: "approve",
      tradeId: pending.tradeId,
    }),
  ).rejects.toMatchObject({ code: "no_pending_interrupt" });
  expect(f.counts().guarded).toBe(0);
  await expect(
    f.coordinator.pending(f.input.runId, { ...f.principal, sub: coreFixture().account.address }),
  ).rejects.toMatchObject({ code: "not_found" });
});

test("a new tick closes an expired interrupt before planning again", async () => {
  const f = await harness();
  await f.coordinator.tick(f.input.runId, f.principal);
  const old = await f.coordinator.pending(f.input.runId, f.principal);
  if (!old) throw new Error("Missing initial approval");
  f.context.nowSec += 601;
  f.ports.nowSec = () => f.context.nowSec;
  expect(await f.coordinator.tick(f.input.runId, f.principal)).toEqual({ v: 1, accepted: true });
  const next = await f.coordinator.pending(f.input.runId, f.principal);
  expect(next?.tradeId).not.toBe(old.tradeId);
  expect(f.counts().released).toBe(1);
});
