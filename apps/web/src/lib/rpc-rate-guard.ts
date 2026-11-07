import { RATE_LIMIT_COOLDOWN_MS, RequestFailure } from "./request";

/** One cooldown per transport prevents simultaneous widgets from retrying a throttled RPC. */
export function createRpcRateGuard() {
  let retryAt = 0;
  return {
    onFetchRequest: () => {
      if (Date.now() < retryAt) throw new RequestFailure("http", 429, retryAt);
    },
    onFetchResponse: (response: Response) => {
      if (response.status !== 429) return;
      const header = response.headers.get("retry-after");
      const seconds = header === null ? Number.NaN : Number(header);
      const fromDate = header ? Date.parse(header) : Number.NaN;
      const delay = Number.isFinite(seconds)
        ? Math.max(0, seconds * 1000)
        : Number.isFinite(fromDate)
          ? Math.max(0, fromDate - Date.now())
          : RATE_LIMIT_COOLDOWN_MS;
      retryAt = Date.now() + delay;
      throw new RequestFailure("http", 429, retryAt);
    },
  };
}
