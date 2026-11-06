"use client";

import { kizashiPoolAbi } from "@kizashi/contracts";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import type { MarketDetail, OwnerPosition } from "../types";

export function usePosition(input: {
  market: MarketDetail;
  owner: Address | undefined;
}): DataState<OwnerPosition> {
  const { market, owner } = input;
  const publicClient = usePublicClient({ chainId: market.chainId });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["position", market.chainId, market.marketId, market.poolAddress, owner],
    queryFn: async () => {
      if (!publicClient || !market.poolAddress || !owner) return null;
      const position = await publicClient.readContract({
        address: market.poolAddress,
        abi: kizashiPoolAbi,
        functionName: "positionOf",
        args: [owner],
      });
      return position;
    },
    enabled: Boolean(publicClient && market.poolAddress && owner),
    refetchInterval: 10_000,
  });

  if (!owner) return { status: "unavailable", reason: copy.market.positionUnavailable };
  if (!market.poolAddress) return { status: "unavailable", reason: copy.market.unavailable };
  if (isLoading) return { status: "loading" };
  if (isError) return { status: "error", message: error?.message || copy.market.error };
  if (!data) {
    const emptyPos = new Array(market.grid.n).fill(0n);
    return {
      status: "ready",
      data: {
        chainId: market.chainId,
        marketId: market.marketId,
        owner,
        positionWad: emptyPos,
        history: { status: "unavailable", reason: copy.market.historyUnavailable },
        blockNumber: market.blockNumber,
        blockHash: market.blockHash,
      },
    };
  }

  return {
    status: "ready",
    data: {
      chainId: market.chainId,
      marketId: market.marketId,
      owner,
      positionWad: data,
      history: { status: "unavailable", reason: copy.market.historyUnavailable },
      blockNumber: market.blockNumber,
      blockHash: market.blockHash,
    },
  };
}
