"use client";

import { factoryAddress } from "@kizashi/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import { copy } from "@/content/copy";
import { marketsQueryOptions } from "@/features/markets";
import type { DataState } from "@/lib/data-state";
import { env } from "@/lib/env";
import { queryResult } from "@/lib/query-result";
import { boundedRead, isRateLimited } from "@/lib/request";
import { fetchPortfolioPositions } from "../lib/fetch-portfolio";
import type { PortfolioPosition } from "../types";

export function usePortfolio(owner: Address | undefined): DataState<readonly PortfolioPosition[]> {
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const chainId = env.NEXT_PUBLIC_CHAIN_ID;
  const arkivWriter = env.NEXT_PUBLIC_ARKIV_LISTING_WRITER;

  const query = useQuery({
    queryKey: ["portfolio", chainId, owner, arkivWriter],
    queryFn: async ({ signal }) => {
      if (!publicClient || !owner) return [];
      return boundedRead(
        async (readSignal) => {
          const markets = await queryClient.query(
            marketsQueryOptions({ client: publicClient, chainId, arkivWriter }),
          );
          readSignal.throwIfAborted();
          return fetchPortfolioPositions(publicClient, owner, {
            markets: markets ?? [],
            chainId,
            signal: readSignal,
          });
        },
        { signal },
      );
    },
    enabled: Boolean(publicClient && owner && factoryAddress(chainId)),
    refetchInterval: (query) => (isRateLimited(query.state.error) ? false : 15_000),
  });

  if (!owner) return { status: "unavailable", reason: copy.portfolio.connect };
  if (!factoryAddress(chainId))
    return { status: "unavailable", reason: copy.portfolio.unavailable };
  if (!publicClient) return { status: "unavailable", reason: copy.feedback.dataUnavailable };
  const result = queryResult(query, copy.portfolio.error);
  if (result.status !== "ready") return result;
  if (result.data.length === 0) return { ...result, status: "empty" };
  return result;
}
