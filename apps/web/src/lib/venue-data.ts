import { copy } from "@/content/copy";
import type { MarketSummary } from "@/features/markets";
import type { DataState } from "./data-state";

export function readMarketListings(): DataState<readonly MarketSummary[]> {
  return { status: "unavailable", reason: copy.markets.unavailable };
}

type VenueTotals = { volumeUsdc: bigint; savedUsdc: bigint; activeMarkets: number };
export function readVenueTotals(): DataState<VenueTotals> {
  return { status: "unavailable", reason: copy.unavailable.indexer };
}
