"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import { QUOTE_DEBOUNCE_MS } from "../lib/defaults";
import { readLiveQuote } from "../lib/read-live-quote";
import type { BetDraft, LocalQuote, MarketDetail, OwnerPosition } from "../types";

type QuoteInput = { market: MarketDetail; position: DataState<OwnerPosition>; draft: BetDraft };
type QuoteResult = QuoteInput & { result: DataState<LocalQuote> };

export function useQuote(input: QuoteInput): DataState<LocalQuote> {
  const { market, position, draft } = input;
  const client = usePublicClient({ chainId: market.chainId });
  const [result, setResult] = useState<QuoteResult>();
  useEffect(() => {
    if (position.status !== "ready" || position.warning) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void readLiveQuote({
        market,
        position: position.data,
        draft,
        client,
        signal: controller.signal,
      }).then(
        (quote) => {
          if (!controller.signal.aborted) setResult({ market, position, draft, result: quote });
        },
        () => {
          if (!controller.signal.aborted)
            setResult({
              market,
              position,
              draft,
              result: { status: "error", message: copy.market.quoteError },
            });
        },
      );
    }, QUOTE_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [market, position, draft, client]);
  if (position.status === "loading" || position.status === "error") return position;
  if (position.status !== "ready")
    return { status: "unavailable", reason: copy.market.positionUnavailable };
  if (position.warning) return { status: "error", message: copy.feedback.staleMarket };
  if (result?.market !== market || result.position !== position || result.draft !== draft)
    return { status: "loading" };
  return result.result;
}
