"use client";

import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import type { DataState } from "@/lib/data-state";
import type { MarketSummary } from "../types";
import { MarketCard } from "./MarketCard";
import { MarketFilters } from "./MarketFilters";
import { MarketListState } from "./MarketListState";

export const filters = {
  kind: parseAsStringLiteral(["all", "binary", "expressive"] as const).withDefault("all"),
  status: parseAsStringLiteral(["all", "open", "resolved"] as const).withDefault("all"),
  sort: parseAsStringLiteral(["closing"] as const).withDefault("closing"),
};
export function MarketList({ result }: { result: DataState<readonly MarketSummary[]> }) {
  const [query, setQuery] = useQueryStates(filters);
  const [nowSec, setNowSec] = useState(0);
  useEffect(() => {
    const tick = () => setNowSec(Math.floor(Date.now() / 1000));
    tick();
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, []);
  const markets =
    result.status === "ready"
      ? result.data
          .filter(
            (market) =>
              (query.kind === "all" || market.kind === query.kind) &&
              (query.status === "all" || market.status === query.status),
          )
          .sort((a, b) => a.closeTimeSec - b.closeTimeSec)
      : [];
  return (
    <div className="flex flex-col gap-8">
      <MarketFilters query={query} setQuery={setQuery} />
      {result.status === "ready" && markets.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {markets.map((market) => (
            <MarketCard
              key={`${market.chainId}:${market.marketId}`}
              market={market}
              nowSec={nowSec}
            />
          ))}
        </div>
      ) : (
        <MarketListState result={result} />
      )}
    </div>
  );
}
