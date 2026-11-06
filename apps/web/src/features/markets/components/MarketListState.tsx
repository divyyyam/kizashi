"use client";
import { Layers3, SearchX } from "lucide-react";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import type { MarketSummary } from "../types";
export function MarketListState({ result }: { result: DataState<readonly MarketSummary[]> }) {
  if (result.status === "loading")
    return (
      <div
        role="status"
        aria-label={copy.markets.loading}
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {["first", "second", "third"].map((slot) => (
          <div
            key={slot}
            className="flex flex-col gap-6 rounded-md border bg-surface p-6"
            aria-hidden="true"
          >
            <div className="h-12 bg-surface-raised" />
            <div className="h-10 bg-surface-raised" />
            <div className="h-12 bg-surface-raised" />
            <div className="h-12 bg-surface-raised" />
          </div>
        ))}
      </div>
    );
  const message =
    result.status === "unavailable"
      ? result.reason
      : result.status === "error"
        ? result.message
        : result.status === "ready" && result.data.length > 0
          ? copy.markets.filteredEmpty
          : copy.markets.empty;
  return (
    <div role={result.status === "error" ? "alert" : "status"} className="venue-state">
      <div className="venue-state-icon" aria-hidden>
        {result.status === "ready" ? <SearchX /> : <Layers3 />}
      </div>
      <p>{message}</p>
    </div>
  );
}
