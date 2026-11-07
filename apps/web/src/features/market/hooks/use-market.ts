"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import { env } from "@/lib/env";
import { queryResult } from "@/lib/query-result";
import { boundedRead, isRateLimited } from "@/lib/request";
import { fetchMarketDetail } from "../lib/fetch-market-detail";
import type { MarketDetail } from "../types";

export function useMarket(identity: {
  marketId: string;
  chainId: number;
}): DataState<MarketDetail> {
  const publicClient = usePublicClient({ chainId: identity.chainId });
  const arkivWriter = env.NEXT_PUBLIC_ARKIV_LISTING_WRITER;

  const query = useQuery({
    queryKey: ["market", identity.chainId, identity.marketId, arkivWriter],
    queryFn: async ({ signal }) => {
      if (!publicClient) throw new Error(copy.market.unavailable);
      return boundedRead(
        () => fetchMarketDetail(publicClient, identity.marketId, identity.chainId, arkivWriter),
        { signal },
      );
    },
    enabled: Boolean(publicClient && identity.marketId),
    refetchInterval: (query) => (isRateLimited(query.state.error) ? false : 10_000),
  });

  if (!publicClient) return { status: "unavailable", reason: copy.feedback.dataUnavailable };
  const result = queryResult(query, copy.market.error);
  if (result.status !== "ready") return result;
  if (result.data === "unsupported")
    return { ...result, status: "unavailable", reason: copy.market.unavailable };
  if (result.data === "not_found") return { ...result, status: "empty" };
  return { ...result, data: result.data };
}
