import { expect, test } from "bun:test";
import { runEventSchema } from "@kizashi/schemas/engine";
import { graphEvents } from "../src/services/graph-events";

test("stream projection emits only typed events and drops internal graph context", () => {
  const events = graphEvents(
    ["updates", { loadContext: { context: { privateInternalField: "must not escape" } } }],
    3,
  );
  expect(events).toEqual([
    { type: "node", data: { node: "loadContext", tick: 3, status: "done" } },
  ]);
  expect(JSON.stringify(events)).not.toContain("privateInternalField");
});

test("typed event envelope rejects unknown versions and mismatched payloads", () => {
  const envelope = {
    v: 1,
    runId: crypto.randomUUID(),
    seq: 1,
    tSec: 1,
    type: "run_stopped",
    data: { reason: "kill_switch" },
  };
  expect(runEventSchema.parse(envelope).type).toBe("run_stopped");
  expect(runEventSchema.safeParse({ ...envelope, v: 2 }).success).toBe(false);
  expect(runEventSchema.safeParse({ ...envelope, data: { reason: "unknown" } }).success).toBe(
    false,
  );
});

test("record projection preserves the tick that ended rather than the next tick", () => {
  expect(graphEvents(["updates", { record: { tick: 4, outcome: "hold" } }], 3)).toContainEqual({
    type: "tick_ended",
    data: { tick: 3, outcome: "hold" },
  });
});
