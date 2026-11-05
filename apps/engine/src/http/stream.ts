import { readRunEndpointRequestSchema } from "@kizashi/schemas/engine";
import { type Response, Router } from "express";
import { z } from "zod";
import { EngineServiceError } from "../errors";
import type { RunControl } from "../services/run-control";
import type { RunEvents } from "../services/run-events";
import { authenticatedPrincipal } from "./require-auth";
import { validate } from "./validate";

const POLL_MS = 1000;
const HEARTBEAT_MS = 15_000;

async function write(response: Response, value: string) {
  if (response.destroyed) return;
  if (response.write(value)) return;
  await new Promise<void>((resolve) => {
    const finish = () => {
      response.off("drain", finish);
      response.off("close", finish);
      resolve();
    };
    response.once("drain", finish);
    response.once("close", finish);
    if (response.destroyed) finish();
  });
}

function pause(response: Response) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      response.off("close", finish);
      resolve();
    };
    const timer = setTimeout(finish, POLL_MS);
    response.once("close", finish);
    if (response.destroyed) finish();
  });
}

async function stream(
  response: Response,
  events: RunEvents,
  input: { id: string; after: number; stopped: boolean },
) {
  let cursor = input.after;
  let lastHeartbeat = Date.now();
  response.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.flushHeaders();
  try {
    while (!response.destroyed) {
      const page = await events.since(input.id, cursor);
      const batch = page.gap
        ? [await events.append(input.id, { type: "resync", data: {} })]
        : page.events;
      const terminal = page.events.find((event) => event.type === "run_stopped");
      if ((page.gap && terminal?.type === "run_stopped") || (input.stopped && batch.length === 0)) {
        batch.push(
          await events.append(input.id, {
            type: "run_stopped",
            data: terminal?.type === "run_stopped" ? terminal.data : { reason: "kill_switch" },
          }),
        );
      }
      for (const event of batch) {
        await write(response, `id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`);
        cursor = event.seq;
        if (event.type === "run_stopped") return;
      }
      if (Date.now() - lastHeartbeat >= HEARTBEAT_MS) {
        await write(response, ": heartbeat\n\n");
        lastHeartbeat = Date.now();
      }
      await pause(response);
    }
  } finally {
    response.end();
  }
}

export function streamRouter(control?: RunControl, events?: RunEvents) {
  const router = Router();
  router.get(
    "/:id/stream",
    validate(readRunEndpointRequestSchema, async ({ input, request, response }) => {
      if (!control || !events)
        throw new EngineServiceError("internal", "Run streaming is unavailable.", 503);
      const run = await control.owned(input.params.id, authenticatedPrincipal(response));
      const parsed = z
        .string()
        .regex(/^(0|[1-9][0-9]*)$/)
        .transform(Number)
        .pipe(z.number().int().nonnegative())
        .safeParse(request.header("Last-Event-ID") ?? "0");
      if (!parsed.success)
        throw new EngineServiceError("bad_request", "The stream cursor is invalid.", 400);
      await stream(response, events, {
        id: input.params.id,
        after: parsed.data,
        stopped: run.stopped,
      });
    }),
  );
  return router;
}
