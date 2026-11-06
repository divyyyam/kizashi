import { bounds } from "@kizashi/core";
import { copy } from "@/content/copy";
import { formatGrid } from "@/lib/format";
import type { MarketSummary } from "../types";
export function bucketLabel(
  market: Pick<MarketSummary, "grid" | "unit" | "precision">,
  bucket: number,
): string {
  const { from, to } = bounds(market.grid, bucket);
  const low = formatGrid(from, market.precision);
  const high = formatGrid(to, market.precision);
  if (bucket === 0) return copy.markets.lowerTail(high, market.unit);
  if (bucket === market.grid.n - 1) return copy.markets.upperTail(low, market.unit);
  return copy.markets.range(low, high, market.unit);
}
