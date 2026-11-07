import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { z } from "zod";
import { copy } from "@/content/copy";
import {
  boundedRead,
  isRateLimited,
  RequestFailure,
  requestJson,
  requestMessage,
  retryRead,
} from "./request";

afterEach(() => mock.restore());
const schema = z.object({ count: z.number().int().nonnegative() });

describe("API reads", () => {
  it("validates a successful response and sends a cancellation signal", async () => {
    const fetch = spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ count: 3 }));
    expect(await requestJson({ url: "/test", schema })).toEqual({ count: 3 });
    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });
  it("rejects HTML and missing fields instead of treating them as data", async () => {
    const fetch = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>service failure</html>"),
    );
    await expect(requestJson({ url: "/test", schema })).rejects.toMatchObject({ kind: "invalid" });
    fetch.mockResolvedValue(Response.json({ status: "ready" }));
    await expect(requestJson({ url: "/test", schema })).rejects.toMatchObject({ kind: "invalid" });
  });
  it("handles a non-JSON HTTP error without exposing its body", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("upstream diagnostic", { status: 503 }),
    );
    await expect(requestJson({ url: "/test", schema })).rejects.toMatchObject({
      kind: "http",
      status: 503,
    });
    expect(requestMessage(new Error("upstream diagnostic"), "Readable fallback")).toBe(
      "Readable fallback",
    );
  });
  it("bounds a request even if its implementation ignores cancellation", async () => {
    spyOn(globalThis, "fetch").mockReturnValue(new Promise<Response>(() => undefined));
    await expect(requestJson({ url: "/test", schema, timeoutMs: 10 })).rejects.toMatchObject({
      kind: "timeout",
    });
  });
  it("cancels on navigation and discards a late completion", async () => {
    const controller = new AbortController();
    const deferred = Promise.withResolvers<number>();
    const read = boundedRead(() => deferred.promise, { signal: controller.signal });
    controller.abort();
    await expect(read).rejects.toMatchObject({ kind: "aborted" });
    deferred.resolve(99);
    expect(await boundedRead(async () => 2)).toBe(2);
  });
  it("does not start an already cancelled operation", async () => {
    const operation = mock(async () => 1);
    await expect(boundedRead(operation, { signal: AbortSignal.abort() })).rejects.toMatchObject({
      kind: "aborted",
    });
    expect(operation).not.toHaveBeenCalled();
  });
});

describe("recovery policy", () => {
  it("recognises wrapped Arc 429 errors and never renders their RPC diagnostics", () => {
    const rpcError = new Error("Contract call failed", {
      cause: Object.assign(
        new Error(
          "Request exceeds defined limit. URL: https://rpc.testnet.arc.io/ Request body: eth_call",
        ),
        { status: 429 },
      ),
    });
    expect(isRateLimited(rpcError)).toBe(true);
    expect(requestMessage(rpcError, "fallback")).toBe(copy.feedback.rateLimited);
    expect(retryRead(0, rpcError)).toBe(false);
    const cyclic: { cause?: unknown } = {};
    cyclic.cause = cyclic;
    expect(isRateLimited(cyclic)).toBe(false);
  });
  it("does not repeat timed out, invalid, or rate limited requests automatically", () => {
    for (const failure of [
      new RequestFailure("timeout"),
      new RequestFailure("invalid"),
      new RequestFailure("http", 429),
    ])
      expect(retryRead(0, failure)).toBe(false);
    expect(retryRead(0, new RequestFailure("network"))).toBe(true);
    expect(retryRead(1, new RequestFailure("network"))).toBe(false);
    expect(requestMessage(new RequestFailure("http", 429), "fallback")).toBe(
      copy.feedback.rateLimited,
    );
  });
  it("never retries POST uploads implicitly", async () => {
    const fetch = spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 502 }));
    await expect(requestJson({ url: "/test", schema, body: { count: 1 } })).rejects.toBeInstanceOf(
      RequestFailure,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
