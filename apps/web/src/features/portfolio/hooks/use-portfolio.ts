"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import { env } from "@/lib/env";
import { fetchPortfolioPositions } from "../lib/fetch-portfolio";
import type { PortfolioPosition } from "../types";

export function usePortfolio(owner: Address | undefined): DataState<readonly PortfolioPosition[]> {
  const publicClient = usePublicClient();
  const chainId = env.NEXT_PUBLIC_CHAIN_ID;
  const arkivWriter = env.NEXT_PUBLIC_ARKIV_LISTING_WRITER;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["portfolio", chainId, owner, arkivWriter],
    queryFn: async () => {
      if (!publicClient || !owner) return [];
      return fetchPortfolioPositions(publicClient, owner, chainId, arkivWriter);
    },
    enabled: Boolean(publicClient && owner),
    refetchInterval: 15_000,
  });

  if (!owner) return { status: "unavailable", reason: copy.portfolio.connect };
  if (!publicClient || isLoading) return { status: "loading" };
  if (isError) return { status: "error", message: error?.message || copy.portfolio.error };
  if (!data || data.length === 0) return { status: "empty" };
  return { status: "ready", data };
}
