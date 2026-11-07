"use client";

import { copy } from "@/content/copy";
import type { DataFeedback } from "@/lib/data-state";
import { RetryButton } from "./RetryButton";

export function RefreshNotice({ warning, refreshing, retry, retryAt }: DataFeedback) {
  if (!warning) return null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4"
    >
      <div className="max-w-2xl space-y-1 text-small">
        <p className="text-warning">{warning}</p>
        <p className="text-text-muted">{copy.feedback.retained}</p>
      </div>
      {retry ? <RetryButton retry={retry} busy={refreshing} retryAt={retryAt} /> : null}
    </div>
  );
}
