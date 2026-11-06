import { modelCopy } from "@/content/model-copy";
import { cn } from "@/lib/cn";
import { closeInLabel } from "../lib/close-in";
import { formatOutcome } from "../lib/outcome-format";
import { compareBets } from "../lib/pricing";
import type { MarketEntry } from "../lib/run-reducer";
import { DistributionChart } from "./DistributionChart";

// Shape advice on a card compares returns per dollar, so any positive stake gives the same pick.
const UNIT_STAKE_USD = 1;

type RunMarketCardProps = {
  readonly entry: MarketEntry;
  readonly sweeping: boolean;
  readonly isPick: boolean;
  readonly nowSec: number;
};

function chartLabel({ market, engine }: MarketEntry): string {
  const crowd = formatOutcome(market.crowd.mean);
  if (engine === null) return modelCopy.card.chart(market.question, crowd, market.unit);
  return modelCopy.card.chartWithEngine(
    market.question,
    crowd,
    formatOutcome(engine.mean),
    market.unit,
  );
}

/** One market the engine found: crowd curve, then the engine's curve, then its verdict. */
export function RunMarketCard({ entry, sweeping, isPick, nowSec }: RunMarketCardProps) {
  const { market, engine, verdict } = entry;
  const rejected = verdict?.kind === "rejected";
  const kept = verdict?.kind === "kept";
  const better =
    kept && engine !== null
      ? compareBets({ ...market, engine, stakeUsd: UNIT_STAKE_USD }).pick
      : null;
  return (
    <article
      className={cn(
        "relative flex h-full flex-col gap-2.5 overflow-hidden rounded-md border bg-bg p-3 transition-colors duration-(--motion-panel)",
        rejected && "border-dashed",
        kept && "border-border-strong",
        isPick && "border-signal",
      )}
    >
      {sweeping ? (
        <span
          aria-hidden
          className="model-sweep pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-linear-to-r from-transparent via-text/8 to-transparent"
        />
      ) : null}
      <div className="flex items-center justify-between gap-2 text-label text-text-muted">
        <span>{market.tag}</span>
        {isPick ? (
          <span className="model-drop rounded-full bg-signal px-2 py-1 text-accent-fg">
            {modelCopy.card.pick}
          </span>
        ) : null}
      </div>
      <h3 className="font-display text-xl leading-tight text-text">{market.question}</h3>
      <DistributionChart
        size="mini"
        domain={market.domain}
        crowd={market.crowd}
        engine={engine}
        label={chartLabel(entry)}
      />
      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3 text-small">
        <div className="flex flex-wrap justify-between gap-2">
          <span className="text-text-muted">{market.unit}</span>
          <span className="tabular text-text-muted">
            {modelCopy.card.closesIn(closeInLabel(market.closeTimeSec, nowSec))}
          </span>
        </div>
        {better === null ? null : (
          <p className="model-drop text-text">
            {better === "curve" ? modelCopy.card.curveBetter : modelCopy.card.binaryBetter}
          </p>
        )}
        {verdict?.kind === "rejected" ? (
          <p className="model-drop text-text-muted">{modelCopy.card.reasons[verdict.reason]}</p>
        ) : null}
      </div>
    </article>
  );
}
