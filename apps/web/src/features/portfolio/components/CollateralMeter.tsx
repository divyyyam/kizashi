import { RollingDigits } from "@/components/motion/RollingDigits";
import { copy } from "@/content/copy";
import { formatPercent, formatWad } from "@/lib/format";
import { portfolioCollateral } from "../lib/collateral";
import type { PortfolioPosition } from "../types";
import { RequirementBar } from "./RequirementBar";
export function CollateralMeter({ positions }: { positions: readonly PortfolioPosition[] }) {
  const totals = portfolioCollateral(positions);
  return (
    <section
      className="flex flex-col gap-6 rounded-md border bg-surface p-6"
      aria-label={copy.portfolio.collateral}
    >
      <h2 className="text-h3 font-medium">{copy.portfolio.collateral}</h2>
      {totals.status === "ready" ? (
        <div className="flex flex-col gap-4">
          <RequirementBar
            label={copy.portfolio.gross}
            value={totals.grossWad}
            gross={totals.grossWad}
          />
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-l pl-4 text-small">
            <span className="text-text-muted">{copy.portfolio.freed}</span>
            <span className="text-saved">
              <RollingDigits value={formatWad(totals.freedWad)} />
            </span>
            <span className="w-full text-text-muted">
              {totals.freedPercentWad === undefined
                ? copy.portfolio.notApplicable
                : copy.portfolio.percentage(formatPercent(totals.freedPercentWad))}
            </span>
          </div>
          <RequirementBar
            label={copy.portfolio.netted}
            value={totals.nettedWad}
            gross={totals.grossWad}
          />
        </div>
      ) : (
        <p role="status" className="text-small text-text-muted">
          {totals.reason}
        </p>
      )}
      <p className="text-small text-text-muted">{copy.portfolio.help}</p>
      <dl className="border-t pt-6">
        <div className="flex flex-wrap justify-between gap-3">
          <dt className="text-small text-text-muted">{copy.portfolio.floor}</dt>
          <dd className="tabular">{formatWad(totals.floorWad)}</dd>
        </div>
      </dl>
    </section>
  );
}
