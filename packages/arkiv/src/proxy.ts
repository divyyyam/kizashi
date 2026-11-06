/**
 * Read-only Arkiv JSON-RPC proxy for a server route. The Arkiv access key lives in the upstream URL
 * path, so browsers talk to this handler and never see the key. Only read methods pass; anything
 * that could send a transaction or open server-side state is refused. No SDK import, so the route
 * stays small.
 */

export const READ_METHODS = new Set([
  "arkiv_query",
  "arkiv_getEntity",
  "arkiv_getBlockTiming",
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBlockByNumber",
  "eth_getLogs",
  "eth_getTransactionCount",
  "net_version",
]);

export type ArkivProxyOptions = {
  /** Keyed upstream URL (server env). Never echoed in a response or log line. */
  upstreamUrl: string;
  timeoutMs?: number;
  maxBodyBytes?: number;
  maxBatch?: number;
  fetch?: typeof fetch;
};

type RpcId = string | number | null;
type RpcRequest = { jsonrpc: "2.0"; id: RpcId; method: string; params?: unknown };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const rpcError = (id: RpcId, code: number, message: string) => ({
  jsonrpc: "2.0" as const,
  id,
  error: { code, message },
});

function isRpcRequest(value: unknown): value is RpcRequest {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const idOk =
    v.id === null ||
    typeof v.id === "string" ||
    (typeof v.id === "number" && Number.isFinite(v.id));
  return v.jsonrpc === "2.0" && idOk && typeof v.method === "string";
}

export function createArkivRpcProxy(options: ArkivProxyOptions) {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxBodyBytes = options.maxBodyBytes ?? 64 * 1024;
  const maxBatch = options.maxBatch ?? 20;
  const doFetch = options.fetch ?? fetch;

  return async function handle(request: Request): Promise<Response> {
    if (request.method !== "POST") return json(rpcError(null, -32600, "POST only"), 405);
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > maxBodyBytes) {
      return json(rpcError(null, -32600, "request too large"), 413);
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return json(rpcError(null, -32700, "parse error"), 400);
    }
    const batch = Array.isArray(body);
    const calls: unknown[] = batch ? (body as unknown[]) : [body];
    if (calls.length === 0 || calls.length > maxBatch) {
      return json(rpcError(null, -32600, `batch must hold 1-${maxBatch} calls`), 400);
    }
    for (const call of calls) {
      if (!isRpcRequest(call)) return json(rpcError(null, -32600, "invalid request"), 400);
      if (!READ_METHODS.has(call.method)) {
        return json(rpcError(call.id, -32601, `method ${call.method} not allowed`), 403);
      }
    }
    try {
      const upstream = await doFetch(options.upstreamUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: text,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const payload = await upstream.text();
      if (!upstream.ok) {
        return json(rpcError(null, -32603, `arkiv upstream returned ${upstream.status}`), 502);
      }
      return new Response(payload, {
        status: 200,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      return json(
        rpcError(null, -32603, timedOut ? "arkiv upstream timed out" : "arkiv unavailable"),
        timedOut ? 504 : 502,
      );
    }
  };
}
