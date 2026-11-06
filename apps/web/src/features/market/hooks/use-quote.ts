"use client";

import { kizashiPoolAbi } from "@kizashi/contracts";
import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import { QUOTE_DEBOUNCE_MS } from "../lib/defaults";
import { buildQuote } from "../lib/quote-preview";
import type { BetDraft, LocalQuote, MarketDetail, OwnerPosition } from "../types";

type QuoteInput = { market: MarketDetail; position: DataState<OwnerPosition>; draft: BetDraft };

export function useQuote(input: QuoteInput): DataState<LocalQuote> {
  const { market, position, draft } = input;
  const publicClient = usePublicClient({ chainId: market.chainId });
  const [result, setResult] = useState<{
    market: MarketDetail;
    position: DataState<OwnerPosition>;
    draft: BetDraft;
    result: DataState<LocalQuote>;
  }>();

  useEffect(() => {
    if (position.status !== "ready") return;
    const pos = position.data;
    const timer = setTimeout(async () => {
      try {
        const local = buildQuote({ market, position: pos, draft });
        if (!local) {
          setResult({ market, position, draft, result: { status: "empty" } });
          return;
        }

        if (publicClient && market.poolAddress) {
          try {
            const onChain = await publicClient.readContract({
              address: market.poolAddress,
              abi: kizashiPoolAbi,
              functionName: "quote",
              args: [pos.owner, [...local.deltaWad]],
            });
            const merged: LocalQuote = {
              ...local,
              chargeWad: onChain.chargeWad,
              chargeUsdc: onChain.chargeUsdc,
              topUpWad: onChain.topUpWad,
              pricesAfter: [...onChain.pricesAfter],
            };
            setResult({ market, position, draft, result: { status: "ready", data: merged } });
            return;
          } catch {
            setResult({
              market,
              position,
              draft,
              result: { status: "error", message: copy.market.quoteError },
            });
            return;
          }
        }

        setResult({ market, position, draft, result: { status: "ready", data: local } });
      } catch {
        setResult({
          market,
          position,
          draft,
          result: { status: "error", message: copy.market.quoteError },
        });
      }
    }, QUOTE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [market, position, draft, publicClient]);

  if (position.status !== "ready")
    return { status: "unavailable", reason: copy.market.positionUnavailable };
  if (result?.market !== market || result.position !== position || result.draft !== draft)
    return { status: "loading" };
  return result.result;
}
