"use client";

import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { RefreshNotice } from "@/components/feedback/RefreshNotice";
import { StatePanel } from "@/components/feedback/StatePanel";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
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
      <div className="rounded-xl border border-border bg-surface p-4 md:p-5">
        <MarketFilters query={query} setQuery={setQuery} />
      </div>
      <RefreshNotice {...result} />
      {result.status === "ready" && markets.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
          {markets.map((market) => (
            <MarketCard
              key={`${market.chainId}:${market.marketId}`}
              market={market}
              nowSec={nowSec}
            />
          ))}
        </div>
      ) : result.status === "ready" ? (
        <StatePanel
          kind="empty"
          title={copy.feedback.filteredEmpty}
          message={copy.markets.filteredEmpty}
        >
          <Button
            type="button"
            variant="secondary"
            onClick={() => void setQuery({ kind: "all", status: "all" })}
          >
            {copy.feedback.resetFilters}
          </Button>
        </StatePanel>
      ) : (
        <MarketListState result={result} />
      )}
    </div>
  );
}
