import { expect, test } from "bun:test";
import { type RunEvent, runEventSchema } from "@kizashi/schemas/engine";
import { EngineServiceError } from "../src/errors";
import type { RunControl } from "../src/services/run-control";
import type { RunEvents } from "../src/services/run-events";
import { coreFixture } from "./fixtures/core";
import { startTestServer } from "./fixtures/http-server";

test("run controls enforce ownership and tick fails explicitly without adapters", async () => {
  const f = coreFixture();
  const principal = { sub: f.account.address, chainId: 31337 };
  let stopped = false;
  const control: RunControl = {
    owned: async (id, owner) => {
      if (owner.sub !== principal.sub || id !== f.input.runId)
        throw new EngineServiceError("not_found", "Not found", 404);
      return { mode: "suggest", stopped };
    },
    mode: async (id, owner, mode) => {
      await control.owned(id, owner);
      return { v: 1, mode };
    },
    stop: async (id, owner) => {
      await control.owned(id, owner);
      stopped = true;
      return { v: 1, stopped: true };
    },
  };
  const server = await startTestServer({ control });
  try {
    const token = await server.tokens.issue(principal, Math.floor(Date.now() / 1000));
    const send = (id: string, action: string, body: object = { v: 1 }) =>
      server.request(`/runs/${id}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    expect((await send(crypto.randomUUID(), "tick")).status).toBe(404);
    const tick = await send(f.input.runId, "tick");
    expect(tick.status).toBe(503);
    expect(await tick.json()).toMatchObject({ error: { code: "vault_unavailable" } });
    expect((await send(f.input.runId, "mode", { v: 2, mode: "suggest" })).status).toBe(400);
    expect((await send(f.input.runId, "stop")).status).toBe(200);
    expect(stopped).toBe(true);
  } finally {
    await server.close();
  }
});

test("authenticated SSE replays after Last-Event-ID and closes after run_stopped", async () => {
  const f = coreFixture();
  const events: RunEvent[] = [
    runEventSchema.parse({
      v: 1,
      runId: f.input.runId,
      seq: 1,
      tSec: f.nowSec,
      type: "tick_ended",
      data: { tick: 0, outcome: "hold" },
    }),
    runEventSchema.parse({
      v: 1,
      runId: f.input.runId,
      seq: 2,
      tSec: f.nowSec,
      type: "run_stopped",
      data: { reason: "kill_switch" },
    }),
  ];
  const control: RunControl = {
    owned: async () => ({ mode: "suggest", stopped: true }),
    mode: async (_id, _owner, mode) => ({ v: 1, mode }),
    stop: async () => ({ v: 1, stopped: true }),
  };
  const store: RunEvents = {
    since: async (_id, after) => ({
      gap: false,
      events: events.filter((event) => event.seq > after),
    }),
    append: async () => {
      throw new Error("No resync should be needed");
    },
  };
  const server = await startTestServer({ control, events: store });
  try {
    const token = await server.tokens.issue(
      { sub: f.account.address, chainId: 31337 },
      Math.floor(Date.now() / 1000),
    );
    expect((await server.request(`/runs/${f.input.runId}/stream`)).status).toBe(401);
    const response = await server.request(`/runs/${f.input.runId}/stream`, {
      headers: { Authorization: `Bearer ${token}`, "Last-Event-ID": "1" },
    });
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const body = await response.text();
    expect(body).toContain("id: 2\n");
    expect(body).not.toContain("id: 1\n");
    const invalid = await server.request(`/runs/${f.input.runId}/stream`, {
      headers: { Authorization: `Bearer ${token}`, "Last-Event-ID": "-1" },
    });
    expect(invalid.status).toBe(400);
  } finally {
    await server.close();
  }
});

test("SSE history gaps emit a unique resync and retain terminal closure", async () => {
  const f = coreFixture();
  let seq = 3;
  const terminal = runEventSchema.parse({
    v: 1,
    runId: f.input.runId,
    seq,
    tSec: f.nowSec,
    type: "run_stopped",
    data: { reason: "kill_switch" },
  });
  const control: RunControl = {
    owned: async () => ({ mode: "suggest", stopped: true }),
    mode: async (_id, _owner, mode) => ({ v: 1, mode }),
    stop: async () => ({ v: 1, stopped: true }),
  };
  const events: RunEvents = {
    since: async () => ({ gap: true, events: [terminal] }),
    append: async (_id, payload) =>
      runEventSchema.parse({ v: 1, runId: f.input.runId, seq: ++seq, tSec: f.nowSec, ...payload }),
  };
  const server = await startTestServer({ control, events });
  try {
    const token = await server.tokens.issue(
      { sub: f.account.address, chainId: 31337 },
      Math.floor(Date.now() / 1000),
    );
    const response = await server.request(`/runs/${f.input.runId}/stream`, {
      headers: { Authorization: `Bearer ${token}`, "Last-Event-ID": "1" },
    });
    const body = await response.text();
    expect(body).toContain('"type":"resync"');
    expect(body).toContain("id: 4\n");
    expect(body).toContain("id: 5\n");
    expect(body).toContain('"type":"run_stopped"');
  } finally {
    await server.close();
  }
});
