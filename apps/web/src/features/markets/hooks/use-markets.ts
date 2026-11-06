"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import { env } from "@/lib/env";
import { fetchMarkets } from "../lib/fetch-markets";
import type { MarketSummary } from "../types";

export function useMarkets(): DataState<readonly MarketSummary[]> {
  const publicClient = usePublicClient();
  const chainId = env.NEXT_PUBLIC_CHAIN_ID;
  const arkivWriter = env.NEXT_PUBLIC_ARKIV_LISTING_WRITER;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["markets", chainId, arkivWriter],
    queryFn: async () => {
      if (!publicClient) throw new Error(copy.unavailable.contracts);
      return fetchMarkets(publicClient, chainId, arkivWriter);
    },
    enabled: Boolean(publicClient),
    refetchInterval: 15_000,
  });

  if (!publicClient || isLoading) return { status: "loading" };
  if (isError) return { status: "error", message: error?.message || copy.markets.error };
  if (data === null || data === undefined)
    return { status: "unavailable", reason: copy.unavailable.contracts };
  if (data.length === 0) return { status: "empty" };
  return { status: "ready", data };
}
