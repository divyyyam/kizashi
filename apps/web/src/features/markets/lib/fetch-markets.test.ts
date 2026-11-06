import { describe, expect, it } from "bun:test";
import type { PublicClient } from "viem";
import { fetchMarkets } from "./fetch-markets";

describe("fetchMarkets", () => {
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
});
