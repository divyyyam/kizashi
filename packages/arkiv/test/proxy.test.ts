import { describe, expect, test } from "bun:test";
import { createArkivRpcProxy } from "../src/proxy";

const UPSTREAM = "https://rpc.example/secret-key";

function proxyWith(reply: () => Promise<Response>) {
  const calls: string[] = [];
  const handle = createArkivRpcProxy({
    upstreamUrl: UPSTREAM,
    fetch: (async (url: string | URL | Request) => {
      calls.push(String(url));
      return reply();
    }) as typeof fetch,
  });
  return { handle, calls };
}

const post = (body: unknown) =>
  new Request("http://app/api/arkiv", { method: "POST", body: JSON.stringify(body) });

describe("arkiv rpc proxy", () => {
  test("forwards read calls", async () => {
    const { handle, calls } = proxyWith(async () =>
      Response.json({ jsonrpc: "2.0", id: 1, result: "0x76ed4f" }),
    );
    const res = await handle(post({ jsonrpc: "2.0", id: 1, method: "eth_chainId" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ jsonrpc: "2.0", id: 1, result: "0x76ed4f" });
    expect(calls).toEqual([UPSTREAM]);
  });

  test("refuses writes without calling upstream", async () => {
    const { handle, calls } = proxyWith(async () => Response.json({}));
    for (const method of ["eth_sendRawTransaction", "eth_sendTransaction", "eth_newFilter"]) {
      const res = await handle(post({ jsonrpc: "2.0", id: 7, method }));
      expect(res.status).toBe(403);
    }
    const batch = await handle(
      post([
        { jsonrpc: "2.0", id: 1, method: "arkiv_query" },
        { jsonrpc: "2.0", id: 2, method: "eth_sendRawTransaction" },
      ]),
    );
    expect(batch.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  test("rejects malformed and oversized bodies", async () => {
    const { handle } = proxyWith(async () => Response.json({}));
    expect((await handle(new Request("http://a", { method: "POST", body: "{" }))).status).toBe(400);
    expect((await handle(post({ id: 1, method: "eth_chainId" }))).status).toBe(400);
    expect((await handle(post([]))).status).toBe(400);
    expect((await handle(new Request("http://a", { method: "GET" }))).status).toBe(405);
    const big = "x".repeat(70 * 1024);
    expect(
      (await handle(post({ jsonrpc: "2.0", id: 1, method: "arkiv_query", params: [big] }))).status,
    ).toBe(413);
  });

  test("never leaks the upstream URL", async () => {
    const { handle } = proxyWith(async () => {
      throw new Error(`connect failed ${UPSTREAM}`);
    });
    const res = await handle(post({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber" }));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("secret-key");
    const { handle: h2 } = proxyWith(async () => new Response("bad gateway", { status: 503 }));
    const r2 = await h2(post({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber" }));
    expect(r2.status).toBe(502);
  });
});
