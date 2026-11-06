"use client";

import { createRunResponseSchema, resumeEndpointRequestSchema, resumeRunResponseSchema, runResponseSchema, stopResponseSchema, tickResponseSchema } from "@kizashi/schemas/engine";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useReducer, useRef } from "react";
import type { z } from "zod";
import { workspaceCopy } from "@/content/model-workspace-copy";
import { engineRequest, EngineHttpError } from "../lib/engine-http";
import { EMPTY_SESSION, sessionReducer } from "../lib/engine-session-state";
import { streamEngine } from "../lib/engine-sse";
import { useEngineIdentity } from "./use-engine-identity";

type Resume = z.infer<typeof resumeEndpointRequestSchema>["body"];
type Context = { token: string; signal: AbortSignal };
export function useEngineSession() {
  const [runId, setRunId] = useQueryState("run", parseAsString);
  const [state, dispatch] = useReducer(sessionReducer, EMPTY_SESSION);
  const identity = useEngineIdentity();
  const operation = useRef<AbortController | null>(null);
  const subscription = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const locked = useRef(false);
  useEffect(() => {
    dispatch({ type: "reset" });
    return () => { operation.current?.abort(); subscription.current?.abort(); revision.current++; locked.current = false; };
  }, [identity.identity]);
  async function refresh(id: string, context: Context) {
    const version = ++revision.current;
    const snapshot = await engineRequest(`/runs/${id}`, runResponseSchema, context);
    if (!context.signal.aborted && version === revision.current) dispatch({ type: "patch", patch: { snapshot } });
    return snapshot;
  }
  function watch(id: string, token: string) {
    subscription.current?.abort();
    const controller = new AbortController();
    subscription.current = controller;
    const context = { token, signal: controller.signal };
    const fail = (error: unknown) => {
      if (!context.signal.aborted) dispatch({ type: "patch", patch: { error: error instanceof Error ? error.message : workspaceCopy.streamError } });
    };
    void streamEngine({ ...context, runId: id,
      onConnection: (streamConnected) => dispatch({ type: "patch", patch: { streamConnected } }),
      onEvent: (event) => {
        if (context.signal.aborted) return;
        dispatch({ type: "event", event });
        if (["rules_pending", "approval_needed", "tx_needed", "tick_ended", "resync", "run_stopped"].includes(event.type)) void refresh(id, context).catch(fail);
      },
    }).catch(fail);
  }
  async function perform(action: (context: Context) => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    const controller = new AbortController(); operation.current = controller;
    dispatch({ type: "patch", patch: { busy: true, error: null } });
    try {
      const token = await identity.authenticate(controller.signal);
      controller.signal.throwIfAborted();
      await action({ token, signal: controller.signal });
    } catch (error) {
      if (error instanceof EngineHttpError && error.status === 401) identity.forget();
      if (!controller.signal.aborted) dispatch({ type: "patch", patch: { error: error instanceof Error ? error.message : workspaceCopy.error } });
    } finally {
      if (operation.current === controller) { locked.current = false; dispatch({ type: "patch", patch: { busy: false } }); }
    }
  }
  async function create(file: File, prompt: string) {
    await perform(async (context) => {
      const body = new FormData(); body.set("rules", file); body.set("v", "1"); body.set("mode", "suggest"); body.set("prompt", prompt.trim());
      const created = await engineRequest("/runs", createRunResponseSchema, { ...context, body });
      context.signal.throwIfAborted();
      await setRunId(created.runId);
      await refresh(created.runId, context);
      watch(created.runId, context.token);
    });
  }
  async function restore() {
    if (!runId || !/^[\da-f-]{36}$/i.test(runId)) return;
    await perform(async (context) => { await refresh(runId, context); watch(runId, context.token); });
  }
  async function resume(body: Resume) {
    if (!runId) return;
    await perform(async (context) => {
      await engineRequest(`/runs/${runId}/resume`, resumeRunResponseSchema, { ...context, body: resumeEndpointRequestSchema.shape.body.parse(body) });
      await refresh(runId, context);
    });
  }
  async function tick() {
    if (!runId) return;
    await perform(async (context) => { await engineRequest(`/runs/${runId}/tick`, tickResponseSchema, { ...context, body: { v: 1 } }); await refresh(runId, context); });
  }
  async function stop() {
    if (!runId) return;
    await perform(async (context) => {
      await engineRequest(`/runs/${runId}/stop`, stopResponseSchema, { ...context, body: { v: 1 } });
      dispatch({ type: "patch", patch: { stopped: true } }); await refresh(runId, context);
    });
  }
  async function reset() {
    operation.current?.abort(); subscription.current?.abort(); revision.current++;
    locked.current = false; dispatch({ type: "reset" }); await setRunId(null);
  }
  return { state, runId, identity, create, restore, resume, tick, stop, reset };
}
export type EngineSession = ReturnType<typeof useEngineSession>;
