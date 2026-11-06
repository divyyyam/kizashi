import { CircleSlash, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { modelCopy } from "@/content/model-copy";
import { formatUsd, usdToUsdc } from "../lib/money";
import type { BetShape } from "../lib/pricing";
import type { Settlement } from "../lib/run-reducer";
import type { EngineMode } from "../types";

const text = modelCopy.actions;
const PLACE_LABEL = { binary: text.takeBinary, curve: text.placeCurve } as const;

type ActionBarProps = {
  readonly mode: EngineMode;
  readonly pick: BetShape;
  readonly stakeUsd: number;
  readonly settlement: Settlement | null;
  readonly onSettle: (settlement: Settlement) => void;
};

function Outcome({ settlement, stakeUsd }: { settlement: Settlement; stakeUsd: number }) {
  const placed = settlement.kind === "placed";
  const Icon = placed ? Send : CircleSlash;
  return (
    <section
      role="status"
      className="model-rise flex shrink-0 items-start gap-3 border-t border-border bg-surface-raised px-4 py-3"
    >
      <Icon aria-hidden strokeWidth={1.5} className="mt-0.5 size-5 text-signal" />
      <div className="flex flex-col gap-1">
        <p className="text-small font-medium text-text">{placed ? text.sent : text.skipped}</p>
        {placed ? (
          <p className="text-small text-text-muted">
            {text.sentDetail(formatUsd(stakeUsd), text.shapeName[settlement.shape])}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** Skip, take the other shape, or place the engine's pick (the engine places it in Autonomous). */
export function ActionBar({ mode, pick, stakeUsd, settlement, onSettle }: ActionBarProps) {
  if (settlement !== null) return <Outcome settlement={settlement} stakeUsd={stakeUsd} />;
  const other: BetShape = pick === "curve" ? "binary" : "curve";
  const place = (shape: BetShape) =>
    onSettle({ kind: "placed", shape, costUsdc: usdToUsdc(stakeUsd) });
  return (
    <fieldset className="model-actions model-rise z-10 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border-strong bg-surface-raised p-3">
      <legend className="sr-only">{text.label}</legend>
      <Button size="sm" variant="ghost" onClick={() => onSettle({ kind: "skipped" })}>
        {text.skip}
      </Button>
      <Button size="sm" variant="secondary" onClick={() => place(other)}>
        {PLACE_LABEL[other]}
      </Button>
      <Button size="sm" onClick={() => place(pick)}>
        {mode === "auto" ? text.auto : PLACE_LABEL[pick]}
      </Button>
    </fieldset>
  );
}
