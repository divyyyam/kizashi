import { describe, expect, it } from "bun:test";
import type { PublicClient } from "viem";
import { zeroAddress } from "viem";
import { fetchMarkets } from "./fetch-markets";

describe("fetchMarkets", () => {
  it("reports a failed pool read instead of claiming that no markets exist", async () => {
    const client = {
      readContract: async ({ functionName }: { functionName: string }) => {
        if (functionName === "marketCount" || functionName === "marketOf") return 1n;
        if (functionName === "poolOf") return `0x${"1".repeat(40)}`;
        throw new Error("RPC unavailable");
      },
    } as unknown as PublicClient;
    await expect(fetchMarkets(client, 5042002)).rejects.toThrow("RPC unavailable");
  });
  it("returns null when chain factory is not defined", async () => {
    const fakeClient = {} as PublicClient;
    const result = await fetchMarkets(fakeClient, 999999);
    expect(result).toBeNull();
  });

  it("returns empty array when marketCount is 0", async () => {
    const fakeClient = {
      readContract: async (args: { functionName: string }) => {
        if (args.functionName === "marketCount") return 0n;
        return null;
      },
    } as unknown as PublicClient;

    const result = await fetchMarkets(fakeClient, 5042002);
    expect(result).toEqual([]);
  });

  it("skips zero address pools", async () => {
    const fakeClient = {
      readContract: async (args: { functionName: string; args?: unknown[] }) => {
        if (args.functionName === "marketCount") return 1n;
        if (args.functionName === "poolOf") return "0x0000000000000000000000000000000000000000";
        return null;
      },
    } as unknown as PublicClient;

    const result = await fetchMarkets(fakeClient, 5042002);
    expect(result).toEqual([]);
  });

  it("stops scheduling pool reads when a request is cancelled", async () => {
    const controller = new AbortController();
    const calls: string[] = [];
    const client = {
      readContract: async ({ functionName }: { functionName: string }) => {
        calls.push(functionName);
        controller.abort();
        return 5n;
      },
    } as unknown as PublicClient;
    await expect(fetchMarkets(client, 5042002, { signal: controller.signal })).rejects.toThrow();
    expect(calls).toEqual(["marketCount"]);
  });

  it("keeps market order and excludes pools whose factory mapping does not match", async () => {
    const wad = 10n ** 18n;
    const client = {
      readContract: async (input: { functionName: string; address: string; args?: bigint[] }) => {
        switch (input.functionName) {
          case "marketCount":
            return 3n;
          case "poolOf":
            return `0x${(input.args?.[0] ?? 0n).toString(16).padStart(40, "0")}`;
          case "marketOf":
            return BigInt(input.args?.[0] ?? 0n) === 2n ? 0n : BigInt(input.args?.[0] ?? 0n);
          case "config":
            return { n: 2n, lo: 0n, w: 1n };
          case "state":
            return 1;
          case "closeTime":
            return 1_800_000_000n;
          case "b":
            return wad;
          case "prices":
            return [wad / 2n, wad / 2n];
          default:
            throw new Error(`Unexpected read: ${input.functionName}`);
        }
      },
    } as unknown as PublicClient;
    const markets = await fetchMarkets(client, 5042002);
    expect(markets?.map((market) => market.marketId)).toEqual(["1", "3"]);
    expect(markets?.every((market) => market.pricesWad.length === market.grid.n)).toBe(true);
  });

  it("overlaps pool discovery while limiting concurrent markets", async () => {
    const firstBatch = Promise.withResolvers<void>();
    let active = 0;
    let maximumActive = 0;
    let poolReads = 0;
    const client = {
      readContract: async ({ functionName }: { functionName: string }) => {
        if (functionName === "marketCount") return 5n;
        poolReads += 1;
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        if (poolReads === 2) firstBatch.resolve();
        await firstBatch.promise;
        active -= 1;
        return zeroAddress;
      },
    } as unknown as PublicClient;
    expect(await fetchMarkets(client, 5042002)).toEqual([]);
    expect(poolReads).toBe(5);
    expect(maximumActive).toBe(2);
  });
});
