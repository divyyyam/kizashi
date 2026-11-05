import type { EngineErrorCode } from "@kizashi/schemas/engine";
import { EngineServiceError } from "../errors";

const ADAPTER_TIMEOUT_MS = 10_000;

export async function callAdapter<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  code: EngineErrorCode = "internal",
  timeoutMs = ADAPTER_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new EngineServiceError(code, "The engine data service did not respond in time.", 503));
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } catch (error) {
    if (error instanceof EngineServiceError) throw error;
    throw new EngineServiceError(code, "The engine data service is unavailable.", 503);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
