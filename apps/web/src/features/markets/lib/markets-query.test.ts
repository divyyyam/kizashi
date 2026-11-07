import { describe, expect, it } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import type { PublicClient } from "viem";
import { marketsQueryOptions } from "./markets-query";

describe("shared market query", () => {
  it("deduplicates concurrent consumers and reuses fresh market data", async () => {
    let reads = 0;
    const client = {
      readContract: async () => {
        reads += 1;
        return 0n;
      },
    } as unknown as PublicClient;
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const options = marketsQueryOptions({ client, chainId: 5042002, arkivWriter: undefined });
    try {
      const results = await Promise.all([cache.query(options), cache.query(options)]);
      expect(results).toEqual([[], []]);
      await cache.query(options);
      expect(reads).toBe(1);
    } finally {
      cache.clear();
    }
  });

  it("isolates different listing writers and propagates failed refreshes", async () => {
    let unavailable = false;
    const client = {
      readContract: async () => {
        if (unavailable) throw new Error("RPC unavailable");
        return 0n;
      },
    } as unknown as PublicClient;
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const options = marketsQueryOptions({ client, chainId: 5042002, arkivWriter: undefined });
    try {
      await cache.query(options);
      const otherWriter = marketsQueryOptions({
        client,
        chainId: 5042002,
        arkivWriter: "unpublished",
      });
      expect(cache.getQueryData(otherWriter.queryKey)).toBeUndefined();
      unavailable = true;
      await expect(cache.query({ ...options, staleTime: 0 })).rejects.toThrow("RPC unavailable");
      expect(cache.getQueryData(options.queryKey)).toEqual([]);
    } finally {
      cache.clear();
    }
  });
});
