import { factoryAddress } from "@kizashi/contracts";
import { queryOptions } from "@tanstack/react-query";
import type { PublicClient } from "viem";
import { copy } from "@/content/copy";
import { boundedRead, isRateLimited } from "@/lib/request";
import { fetchMarkets } from "./fetch-markets";

const MARKET_STALE_TIME_MS = 10_000;
const MARKET_REFRESH_INTERVAL_MS = 15_000;

/** Lobby and portfolio share the same request, freshness policy and in-flight result. */
export function marketsQueryOptions(input: {
  client: PublicClient | undefined;
  chainId: number;
  arkivWriter: string | undefined;
}) {
  const { client, chainId, arkivWriter } = input;
  return queryOptions({
    queryKey: ["markets", chainId, arkivWriter],
    queryFn: ({ signal }) => {
      if (!client) throw new Error(copy.unavailable.contracts);
      return boundedRead(
        (readSignal) => fetchMarkets(client, chainId, { arkivWriter, signal: readSignal }),
        { signal },
      );
    },
    enabled: Boolean(client && factoryAddress(chainId)),
    staleTime: MARKET_STALE_TIME_MS,
    refetchInterval: (query) =>
      isRateLimited(query.state.error) ? false : MARKET_REFRESH_INTERVAL_MS,
  });
}
