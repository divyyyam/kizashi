import { errorResponseSchema } from "@kizashi/schemas/engine";
import { z } from "zod";
import { workspaceCopy } from "@/content/model-workspace-copy";

export const ENGINE_URL = (() => {
  const parsed = z.url().safeParse(process.env.NEXT_PUBLIC_ENGINE_URL);
  return parsed.success ? parsed.data.replace(/\/+$/, "") : null;
})();
const REQUEST_TIMEOUT_MS = 90_000;

export class EngineHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function engineRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: {
    token?: string;
    signal: AbortSignal;
    body?: FormData | object;
  },
) {
  if (!ENGINE_URL) throw new Error(workspaceCopy.unconfigured);
  const headers = new Headers();
  if (options.token) headers.set("authorization", `Bearer ${options.token}`);
  const form = options.body instanceof FormData;
  if (options.body && !form) headers.set("content-type", "application/json");
  const response = await fetch(`${ENGINE_URL}${path}`, {
    method: options.body ? "POST" : "GET",
    headers,
    cache: "no-store",
    ...(options.body
      ? { body: form ? (options.body as FormData) : JSON.stringify(options.body) }
      : {}),
    signal: AbortSignal.any([options.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const parsed = errorResponseSchema.safeParse(body);
    throw new EngineHttpError(
      response.status,
      response.status === 401
        ? workspaceCopy.unauthorized
        : parsed.success
          ? parsed.data.error.message
          : workspaceCopy.error,
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new Error(workspaceCopy.invalidResponse);
  return parsed.data;
}
