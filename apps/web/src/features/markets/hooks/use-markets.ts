"use client";

import { factoryAddress } from "@kizashi/contracts";
import { useQuery } from "@tanstack/react-query";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import { env } from "@/lib/env";
import { marketReader } from "@/lib/market-reader";
import { queryResult } from "@/lib/query-result";
import { marketsQueryOptions } from "../lib/markets-query";
import type { MarketSummary } from "../types";

export function useMarkets(): DataState<readonly MarketSummary[]> {
  const chainId = env.NEXT_PUBLIC_CHAIN_ID;
  const arkivWriter = env.NEXT_PUBLIC_ARKIV_LISTING_WRITER;

  const query = useQuery(marketsQueryOptions({ client: marketReader, chainId, arkivWriter }));

  if (!factoryAddress(chainId))
    return { status: "unavailable", reason: copy.unavailable.contracts };
  const result = queryResult(query, copy.markets.error);
  if (result.status !== "ready") return result;
  if (result.data === null)
    return { ...result, status: "unavailable", reason: copy.unavailable.contracts };
  if (result.data.length === 0) return { ...result, status: "empty" };
  return { ...result, data: result.data };
}
