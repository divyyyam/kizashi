"use client";
import Link from "next/link";
import { StatePanel } from "@/components/feedback/StatePanel";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import type { MarketSummary } from "../types";
import { MarketsSkeleton } from "./MarketsSkeleton";
export function MarketListState({ result }: { result: DataState<readonly MarketSummary[]> }) {
  if (result.status === "loading") return <MarketsSkeleton />;
  const message =
    result.status === "unavailable"
      ? result.reason
      : result.status === "error"
        ? result.message
        : result.status === "ready" && result.data.length > 0
          ? copy.markets.filteredEmpty
          : copy.markets.empty;
  return (
    <StatePanel
      kind={
        result.status === "error"
          ? "error"
          : result.status === "unavailable"
            ? "unavailable"
            : "empty"
      }
      title={result.status === "empty" ? copy.feedback.marketsEmpty : undefined}
      message={message}
      retry={result.retry}
      retryAt={result.retryAt}
      busy={result.refreshing}
    >
      {result.status === "empty" ? (
        <Button asChild>
          <Link href="/markets/new">{copy.markets.create}</Link>
        </Button>
      ) : null}
    </StatePanel>
  );
}
