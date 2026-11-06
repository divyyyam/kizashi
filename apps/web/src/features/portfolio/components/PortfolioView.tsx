import { copy } from "@/content/copy";
import type { DataState } from "@/lib/data-state";
import type { PortfolioPosition } from "../types";
import { CollateralMeter } from "./CollateralMeter";
import { PositionList } from "./PositionList";
export function PortfolioView({ result }: { result: DataState<readonly PortfolioPosition[]> }) {
  if (result.status === "ready" && result.data.some((position) => position.lifecycle === "active"))
    return (
      <div className="flex flex-col gap-8">
        <CollateralMeter positions={result.data} />
        <PositionList positions={result.data} />
      </div>
    );
  if (result.status === "loading")
    return (
      <div
        role="status"
        aria-label={copy.portfolio.loading}
        className="flex flex-col gap-8"
        aria-busy="true"
      >
        <div className="h-96 rounded-md border bg-surface" />
        <div className="h-48 rounded-md border bg-surface" />
      </div>
    );
  return (
    <p
      role={result.status === "error" ? "alert" : "status"}
      className="rounded-md border bg-surface px-6 py-16 text-center text-text-muted"
    >
      {result.status === "unavailable"
        ? result.reason
        : result.status === "error"
          ? result.message
          : copy.portfolio.empty}
    </p>
  );
}
