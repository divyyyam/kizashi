import { kizashiPoolAbi } from "@kizashi/contracts";
import type { PublicClient } from "viem";
import type { DataState } from "@/lib/data-state";
import { boundedRead } from "@/lib/request";
import type { BetDraft, LocalQuote, MarketDetail, OwnerPosition } from "../types";
import { buildQuote } from "./quote-preview";

export async function readLiveQuote(input: {
  market: MarketDetail;
  position: OwnerPosition;
  draft: BetDraft;
  client: PublicClient | undefined;
  signal: AbortSignal;
}): Promise<DataState<LocalQuote>> {
  const { market, position, draft, client, signal } = input;
  const local = buildQuote({ market, position, draft });
  if (!local) return { status: "empty" };
  const pool = market.poolAddress;
  if (!client || !pool) return { status: "ready", data: local };
  const quote = await boundedRead(
    () =>
      client.readContract({
        address: pool,
        abi: kizashiPoolAbi,
        functionName: "quote",
        args: [position.owner, [...local.deltaWad]],
        blockNumber: market.blockNumber,
      }),
    { signal },
  );
  return {
    status: "ready",
    data: {
      ...local,
      chargeWad: quote.chargeWad,
      chargeUsdc: quote.chargeUsdc,
      topUpWad: quote.topUpWad,
      pricesAfter: [...quote.pricesAfter],
    },
  };
}
