"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address, PublicClient } from "viem";
import { copy } from "@/content/copy";
import { queryResult } from "@/lib/query-result";
import { RequestFailure } from "@/lib/request";
import { readTicketHistory } from "@/lib/ticket-history";
import type { History, MarketDetail } from "../types";

export function usePositionHistory(input: {
  client: PublicClient | undefined;
  market: MarketDetail;
  owner: Address | undefined;
  position: readonly bigint[] | undefined;
}) {
  const { client, market, owner, position } = input;
  const pool = market.poolAddress;
  const query = useQuery<History>({
    queryKey: ["ticket-history", market.chainId, pool, owner, market.blockHash],
    enabled: Boolean(client && pool && owner && position),
    retry: false,
    queryFn: ({ signal }) => {
      if (!client || !pool || !owner || !position) throw new RequestFailure("service");
      return readTicketHistory({
        client,
        chainId: market.chainId,
        marketId: market.marketId,
        pool,
        owner,
        position,
        block: market.blockNumber,
        hash: market.blockHash,
        signal,
      });
    },
  });
  return queryResult(query, copy.market.historyUnavailable);
}
