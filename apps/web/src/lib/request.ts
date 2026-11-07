import type { z } from "zod";
import { copy } from "@/content/copy";

export const READ_TIMEOUT_MS = 30_000;
export const RATE_LIMIT_COOLDOWN_MS = 30_000;
const HTTP_TIMEOUT_MS = 20_000;
type FailureKind = "timeout" | "aborted" | "network" | "http" | "invalid" | "service";

export class RequestFailure extends Error {
  constructor(
    readonly kind: FailureKind,
    readonly status?: number,
    readonly retryAt?: number,
  ) {
    super(kind);
    this.name = "RequestFailure";
  }
}

/** Also bounds reads whose SDK does not accept an AbortSignal; late results are discarded. */
export function boundedRead<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: { signal?: AbortSignal | undefined; timeoutMs?: number } = {},
): Promise<T> {
  const timeout = AbortSignal.timeout(options.timeoutMs ?? READ_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new RequestFailure(timeout.aborted ? "timeout" : "aborted"));
    if (signal.aborted) return abort();
    signal.addEventListener("abort", abort, { once: true });
    const settle = () => signal.removeEventListener("abort", abort);
    Promise.resolve()
      .then(() => operation(signal))
      .then(
        (value) => {
          settle();
          resolve(value);
        },
        (error: unknown) => {
          settle();
          reject(error);
        },
      );
  });
}

export function requestJson<T>(options: {
  url: string;
  schema: z.ZodType<T>;
  signal?: AbortSignal | undefined;
  body?: FormData | object;
  timeoutMs?: number;
}): Promise<T> {
  return boundedRead(
    async (signal) => {
      let response: Response;
      try {
        const form = options.body instanceof FormData;
        response = await fetch(options.url, {
          method: options.body ? "POST" : "GET",
          cache: "no-store",
          signal,
          ...(options.body
            ? {
                body: form ? (options.body as FormData) : JSON.stringify(options.body),
                ...(!form ? { headers: { "content-type": "application/json" } } : {}),
              }
            : {}),
        });
      } catch {
        throw new RequestFailure("network");
      }
      if (!response.ok) throw new RequestFailure("http", response.status);
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new RequestFailure("invalid");
      }
      const parsed = options.schema.safeParse(body);
      if (!parsed.success) throw new RequestFailure("invalid");
      return parsed.data;
    },
    { signal: options.signal, timeoutMs: options.timeoutMs ?? HTTP_TIMEOUT_MS },
  );
}

export function requestMessage(error: unknown, fallback: string): string {
  if (isRateLimited(error)) return copy.feedback.rateLimited;
  if (!(error instanceof RequestFailure)) return fallback;
  if (error.kind === "timeout") return copy.feedback.timeout;
  if (error.kind === "invalid") return copy.feedback.invalid;
  if (error.kind === "network") return copy.feedback.offline;
  if (error.status === 429) return copy.feedback.rateLimited;
  if (error.status === 413) return copy.feedback.fileLarge;
  if (error.status === 401 || error.status === 403) return copy.feedback.denied;
  return fallback;
}

export function retryRead(failureCount: number, error: Error): boolean {
  if (isRateLimited(error)) return false;
  if (failureCount >= 1) return false;
  if (!(error instanceof RequestFailure)) return true;
  return error.kind === "network" || (error.kind === "http" && (error.status ?? 0) >= 500);
}

export function isRateLimited(error: unknown): boolean {
  const seen = new Set<object>();
  let cause = error;
  while (cause && typeof cause === "object" && !seen.has(cause)) {
    seen.add(cause);
    const entry = cause as Record<string, unknown>;
    if (entry.status === 429 || entry.statusCode === 429 || entry.code === -32005) return true;
    if (
      typeof entry.message === "string" &&
      /status:\s*429\b|rate.?limit|too many requests|request exceeds defined limit/i.test(
        entry.message,
      )
    )
      return true;
    cause = entry.cause;
  }
  return false;
}

export function rateLimitRetryAt(error: unknown, updatedAt: number): number {
  const seen = new Set<object>();
  let cause = error;
  while (cause && typeof cause === "object" && !seen.has(cause)) {
    seen.add(cause);
    const entry = cause as Record<string, unknown>;
    if (typeof entry.retryAt === "number" && Number.isFinite(entry.retryAt)) return entry.retryAt;
    cause = entry.cause;
  }
  return updatedAt + RATE_LIMIT_COOLDOWN_MS;
}
