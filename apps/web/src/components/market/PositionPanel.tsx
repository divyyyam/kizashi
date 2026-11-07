import { floorOf, freed } from "@kizashi/core";
import { LoadingRegion } from "@/components/feedback/LoadingRegion";
import { RetryButton } from "@/components/feedback/RetryButton";
import { StatePanel } from "@/components/feedback/StatePanel";
import { RollingDigits } from "@/components/motion/RollingDigits";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/content/copy";
import type { OwnerPosition } from "@/features/market";
import type { DataState } from "@/lib/data-state";
import { formatWad } from "@/lib/format";

export function PositionPanel({ result }: { result: DataState<OwnerPosition> }) {
  if (result.status === "loading")
    return (
      <LoadingRegion label={copy.motion.position} className="space-y-3 border-t border-border pt-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full" />
      </LoadingRegion>
    );
  if (result.status === "error")
    return (
      <StatePanel
        compact
        kind="error"
        message={result.message}
        retry={result.retry}
        retryAt={result.retryAt}
        busy={result.refreshing}
      />
    );
  if (result.status !== "ready")
    return (
      <p className="border-t border-border py-4 text-small text-text-muted">
        {copy.market.connect}
      </p>
    );
  const { history, positionWad, historyFeedback } = result.data;
  const rows: readonly (readonly [string, string])[] =
    history.status === "complete"
      ? [
          [copy.motion.tickets, String(history.originalTicketsWad.length)],
          [copy.portfolio.floor, formatWad(floorOf(positionWad))],
          [copy.motion.saved, formatWad(freed(history.originalTicketsWad))],
        ]
      : [[copy.portfolio.floor, formatWad(floorOf(positionWad))]];
  return (
    <section aria-label={copy.motion.position} className="space-y-4 border-t border-border pt-5">
      <h2 className="text-label text-text-muted">{copy.motion.position}</h2>
      <dl className="grid gap-4 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="space-y-1">
            <dt className="text-small text-text-muted">{label}</dt>
            <dd className={label === copy.motion.saved ? "text-saved" : "tabular text-text"}>
              <RollingDigits value={value} />
            </dd>
          </div>
        ))}
      </dl>
      {history.status === "unavailable" ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
        >
          <p className="max-w-md text-small text-text-muted">{history.reason}</p>
          {historyFeedback?.retry && !historyFeedback.refreshing ? (
            <RetryButton retry={historyFeedback.retry} retryAt={historyFeedback.retryAt} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
