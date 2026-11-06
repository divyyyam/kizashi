import { simpleToExpressive } from "@kizashi/core";
import type { BetDraft, MarketDetail } from "../types";
export const QUOTE_DEBOUNCE_MS = 120;
export function initialDraft(market: MarketDetail): BetDraft {
  const threshold = Math.floor(market.grid.n / 2);
  const expressive = simpleToExpressive(market.grid, { direction: "above", threshold });
  return {
    mode: market.kind === "binary" ? "simple" : "expressive",
    direction: "above",
    threshold,
    ...expressive,
    spend: "",
  };
}
