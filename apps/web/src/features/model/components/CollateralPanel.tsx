import { modelCopy } from "@/content/model-copy";
import { cn } from "@/lib/cn";
import { formatUsd } from "../lib/money";
import { estimateNetting, type PayoutLeg } from "../lib/netting";
import {
  type BetComparison,
  binaryPayoutAt,
  curvePayoutAt,
  type PricingInput,
  sideWins,
} from "../lib/pricing";
import type { HeldPosition } from "../types";

const text = modelCopy.collateral;

type CollateralPanelProps = {
  readonly input: PricingInput;
  readonly comparison: BetComparison;
  readonly held: readonly HeldPosition[];
};

function legs(input: PricingInput, comparison: BetComparison, held: readonly HeldPosition[]) {
  const heldLegs: PayoutLeg[] = held.map((position) => ({
    stakeUsd: position.stakeUsd,
    payoutAt: (x) =>
      sideWins(x, position.threshold, position.side) ? position.stakeUsd / position.price : 0,
  }));
  const next: PayoutLeg =
    comparison.pick === "curve"
      ? { stakeUsd: input.stakeUsd, payoutAt: (x) => curvePayoutAt(x, input) }
      : {
          stakeUsd: input.stakeUsd,
          payoutAt: (x) => binaryPayoutAt(x, comparison.binary, input.threshold),
        };
  return [...heldLegs, next];
}

function LockedBar({
  label,
  amountUsd,
  ratio,
  netted,
}: {
  label: string;
  amountUsd: number;
  ratio: number;
  netted: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4 text-small">
        <span className="text-text-muted">{label}</span>
        <span className="tabular text-body text-text">{formatUsd(amountUsd)}</span>
      </div>
      <div aria-hidden className="h-3 overflow-hidden rounded-full bg-surface-raised">
        <div
          className={cn("model-grow h-full origin-left", netted ? "bg-saved" : "bg-text-faint")}
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
    </div>
  );
}

/** Locked collateral for the pick with what is already held: summed worst cases vs netted. */
export function CollateralPanel({ input, comparison, held }: CollateralPanelProps) {
  const estimate = estimateNetting(legs(input, comparison, held), input.domain);
  const gross = estimate.grossLockedUsd;
  const ratio = (value: number) => (gross > 0 ? value / gross : 0);
  return (
    <section
      aria-labelledby="engine-collateral"
      className="model-rise mx-auto flex max-w-2xl flex-col gap-5 py-3 md:p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="engine-collateral" className="text-label text-signal">
          {text.eyebrow}
        </h2>
        <span className="rounded-full border border-warning px-2 py-1 text-label text-warning">
          {text.estimate}
        </span>
      </div>
      <LockedBar label={text.without} amountUsd={gross} ratio={1} netted={false} />
      <LockedBar
        label={text.withNetting}
        amountUsd={estimate.nettedLockedUsd}
        ratio={ratio(estimate.nettedLockedUsd)}
        netted
      />
      <div className="flex items-baseline justify-between gap-4 border-t border-dashed border-border pt-4">
        <span className="text-small text-text-muted">{text.freed}</span>
        <span className="tabular text-h3 text-saved">
          {formatUsd(gross - estimate.nettedLockedUsd)}
        </span>
      </div>
      <p className="text-small text-text-muted">
        {text.explain} {text.held(held.length)}
      </p>
    </section>
  );
}
