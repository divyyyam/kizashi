"use client";

import { LoadingRegion } from "@/components/feedback/LoadingRegion";
import { RefreshNotice } from "@/components/feedback/RefreshNotice";
import { StatePanel } from "@/components/feedback/StatePanel";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import { MarketDetails } from "./MarketDetails";
import type { MarketMetaView } from "./metadata-response";

export function MarketMetaPanel({ state }: { state: DataState<MarketMetaView> }) {
  const text = copy.feedback.metadata;
  return (
    <section className="min-w-0 space-y-5 rounded-xl border border-border bg-surface p-5 md:p-6">
      <h2 className="text-h3 text-text">{text.title}</h2>
      {state.status === "loading" ? (
        <LoadingRegion label={text.loading} className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </LoadingRegion>
      ) : state.status === "ready" ? (
        <>
          <RefreshNotice {...state} />
          <MarketDetails details={state.data} />
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
