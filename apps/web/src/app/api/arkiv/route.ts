import { createArkivRpcProxy } from "@kizashi/arkiv/proxy";

// Read-only Arkiv JSON-RPC proxy. The access key sits in ARKIV_RPC_URL's path and stays on the
// server; browsers build their Arkiv reader with rpcUrl "/api/arkiv".
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let cached: { url: string; handle: ReturnType<typeof createArkivRpcProxy> } | undefined;

export async function POST(request: Request): Promise<Response> {
  const upstreamUrl = process.env.ARKIV_RPC_URL?.trim();
  if (!upstreamUrl) {
    return Response.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32603, message: "arkiv unavailable: ARKIV_RPC_URL is not set" },
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
  if (!cached || cached.url !== upstreamUrl) {
    cached = { url: upstreamUrl, handle: createArkivRpcProxy({ upstreamUrl }) };
  }
  return cached.handle(request);
}
