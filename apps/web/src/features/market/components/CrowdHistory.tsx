"use client";

import { LoadingRegion } from "@/components/feedback/LoadingRegion";
import { RefreshNotice } from "@/components/feedback/RefreshNotice";
import { StatePanel } from "@/components/feedback/StatePanel";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/content/copy";
import { useCrowdHistory } from "../hooks/use-crowd-history";
import { CrowdHistoryChart } from "./CrowdHistoryChart";

export function CrowdHistory({ marketId }: { marketId: string }) {
  const state = useCrowdHistory(marketId);
  const text = copy.feedback.history;
  return (
    <section className="min-w-0 space-y-5 rounded-xl border border-border bg-surface p-5 md:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-h3 text-text">{text.title}</h2>
        <p className="text-small text-text-faint">{text.source}</p>
      </header>
      {state.status === "loading" ? (
        <LoadingRegion label={text.loading} className="space-y-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </LoadingRegion>
      ) : state.status === "ready" ? (
        <>
          <RefreshNotice {...state} />
          <CrowdHistoryChart points={state.data} />
        </>
      ) : (
        <StatePanel
          compact
          kind={state.status}
          message={
            state.status === "error"
              ? state.message
              : state.status === "unavailable"
                ? state.reason
                : text.empty
          }
          retry={state.retry}
          retryAt={state.retryAt}
          busy={state.refreshing}
        />
      )}
    </section>
  );
}
