"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import { queryResult } from "@/lib/query-result";
import { readOwnerPosition } from "../lib/read-owner-position";
import type { MarketDetail, OwnerPosition } from "../types";
import { usePositionHistory } from "./use-position-history";

export function usePosition({
  market,
  owner,
}: {
  market: MarketDetail;
  owner: Address | undefined;
}): DataState<OwnerPosition> {
  const client = usePublicClient({ chainId: market.chainId });
  const query = useQuery({
    queryKey: ["position", market.chainId, market.poolAddress, owner, market.blockHash],
    enabled: Boolean(client && market.poolAddress && owner),
    queryFn: ({ signal }) => readOwnerPosition({ client, market, owner, signal }),
  });
  const position = queryResult(query, copy.market.error);
  const history = usePositionHistory({
    client,
    market,
    owner,
    position: position.status === "ready" ? position.data.positionWad : undefined,
  });
  if (!owner) return { status: "unavailable", reason: copy.market.connect };
  if (!client || !market.poolAddress)
    return { status: "unavailable", reason: copy.feedback.dataUnavailable };
  if (position.status !== "ready") return position;
  const currentHistory =
    history.status === "ready"
      ? history.data
      : {
          status: "unavailable" as const,
          reason:
            history.status === "loading"
              ? copy.feedback.historyLoading
              : history.status === "error"
                ? history.message
                : copy.market.historyUnavailable,
        };
  return {
    ...position,
    data: {
      ...position.data,
      history: currentHistory,
      historyFeedback: {
        ...(history.retry ? { retry: history.retry } : {}),
        refreshing: Boolean(history.refreshing),
        ...(history.retryAt ? { retryAt: history.retryAt } : {}),
      },
    },
  };
}
