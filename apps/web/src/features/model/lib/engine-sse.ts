import { type RunEvent, runEventSchema } from "@kizashi/schemas/engine";
import { workspaceCopy } from "@/content/model-workspace-copy";
import { ENGINE_URL, EngineHttpError } from "./engine-http";

const MAX_FRAME_CHARACTERS = 512 * 1024;
const IDLE_TIMEOUT_MS = 35_000;
const MAX_RETRIES = 3;

export function createEventDecoder(runId: string) {
  let buffer = "";
  return (chunk: string): RunEvent[] => {
    buffer += chunk;
    const events: RunEvent[] = [];
    let boundary = /\r?\n\r?\n/.exec(buffer);
    while (boundary) {
      const frame = buffer.slice(0, boundary.index);
      buffer = buffer.slice(boundary.index + boundary[0].length);
      if (frame.length > MAX_FRAME_CHARACTERS) throw new Error(workspaceCopy.invalidResponse);
      const data = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (data) {
        const event = runEventSchema.parse(JSON.parse(data));
        if (event.runId !== runId) throw new Error(workspaceCopy.invalidResponse);
        events.push(event);
      }
      boundary = /\r?\n\r?\n/.exec(buffer);
    }
    if (buffer.length > MAX_FRAME_CHARACTERS) throw new Error(workspaceCopy.invalidResponse);
    return events;
  };
}

type StreamOptions = {
  runId: string;
  token: string;
  signal: AbortSignal;
  onEvent: (event: RunEvent) => void;
  onConnection: (connected: boolean) => void;
};
async function readStream(options: StreamOptions, after: number): Promise<void> {
  const idle = new AbortController();
  const signal = AbortSignal.any([options.signal, idle.signal]);
  let timer = setTimeout(() => idle.abort(), IDLE_TIMEOUT_MS);
  try {
    const response = await fetch(`${ENGINE_URL}/runs/${options.runId}/stream`, {
      headers: {
        authorization: `Bearer ${options.token}`,
        "Last-Event-ID": String(after),
        accept: "text/event-stream",
      },
      signal,
      cache: "no-store",
    });
    if (!response.ok) throw new EngineHttpError(response.status, workspaceCopy.streamError);
    if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream"))
      throw new Error(workspaceCopy.invalidResponse);
    options.onConnection(true);
    const reader = response.body.getReader();
    const decode = createEventDecoder(options.runId);
    const text = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) throw new Error(workspaceCopy.streamError);
        clearTimeout(timer);
        timer = setTimeout(() => idle.abort(), IDLE_TIMEOUT_MS);
        for (const event of decode(text.decode(value, { stream: true }))) {
          options.onEvent(event);
          if (event.type === "run_stopped") return;
        }
      }
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
  } finally {
    clearTimeout(timer);
  }
}

function backoff(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    signal.addEventListener("abort", finish, { once: true });
    if (signal.aborted) finish();
  });
}

export async function streamEngine(options: StreamOptions) {
  let cursor = 0;
  for (let attempt = 0; attempt <= MAX_RETRIES && !options.signal.aborted; attempt++) {
    try {
      await readStream(
        {
          ...options,
          onEvent: (event) => {
            if (event.seq <= cursor) return;
            cursor = event.seq;
            options.onEvent(event);
          },
        },
        cursor,
      );
      return;
    } catch (error) {
      if (options.signal.aborted) return;
      options.onConnection(false);
      if (attempt === MAX_RETRIES || (error instanceof EngineHttpError && error.status === 401))
        throw error;
      await backoff(1000 * 2 ** attempt, options.signal);
    }
  }
}
