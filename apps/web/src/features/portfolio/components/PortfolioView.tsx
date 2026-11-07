import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import type { PortfolioPosition } from "../types";
import { CollateralMeter } from "./CollateralMeter";
import { PortfolioSkeleton } from "./PortfolioSkeleton";
import { PositionList } from "./PositionList";
export function PortfolioView({ result }: { result: DataState<readonly PortfolioPosition[]> }) {
  if (result.status === "ready" && result.data.some((position) => position.lifecycle === "active"))
    return (
      <div className="flex flex-col gap-8">
        <RefreshNotice {...result} />
        <CollateralMeter positions={result.data} />
        <section className="space-y-4">
          <h2 className="text-h3 text-text">{copy.feedback.positionHistory}</h2>
          <PositionList positions={result.data} />
        </section>
      </div>
    );
  if (result.status === "loading") return <PortfolioSkeleton />;
  return (
    <StatePanel
      kind={
        result.status === "error"
          ? "error"
          : result.status === "unavailable"
            ? "unavailable"
            : "empty"
      }
      title={
        result.status === "empty" || result.status === "ready"
          ? copy.feedback.portfolioEmpty
          : undefined
      }
      retry={result.retry}
      retryAt={result.retryAt}
      busy={result.refreshing}
      message={
        result.status === "unavailable"
          ? result.reason
          : result.status === "error"
            ? result.message
            : copy.portfolio.empty
      }
    >
      {result.status === "empty" || result.status === "ready" ? <MarketsLink /> : null}
    </StatePanel>
  );
}

import { MarketsLink } from "@/components/feedback/MarketsLink";
import { RefreshNotice } from "@/components/feedback/RefreshNotice";
import { StatePanel } from "@/components/feedback/StatePanel";
