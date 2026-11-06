"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import { env } from "@/lib/env";
import { fetchMarketDetail } from "../lib/fetch-market-detail";
import type { MarketDetail } from "../types";

export function useMarket(identity: {
  marketId: string;
  chainId: number;
}): DataState<MarketDetail> {
  const publicClient = usePublicClient({ chainId: identity.chainId });
  const arkivWriter = env.NEXT_PUBLIC_ARKIV_LISTING_WRITER;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["market", identity.chainId, identity.marketId, arkivWriter],
    queryFn: async () => {
      if (!publicClient) throw new Error(copy.market.unavailable);
      return fetchMarketDetail(publicClient, identity.marketId, identity.chainId, arkivWriter);
    },
    enabled: Boolean(publicClient && identity.marketId),
    refetchInterval: 10_000,
  });

  if (!publicClient || isLoading) return { status: "loading" };
  if (isError) return { status: "error", message: error?.message || copy.market.error };
  if (data === "unsupported") return { status: "unavailable", reason: copy.market.unavailable };
  if (data === "not_found" || !data) return { status: "empty" };
  return { status: "ready", data };
}
