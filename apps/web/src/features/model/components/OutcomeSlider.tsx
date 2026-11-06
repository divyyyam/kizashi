import { useId } from "react";
import { modelCopy } from "@/content/model-copy";
import { formatUsd } from "@/features/model/lib/money";
import type { OutcomeDomain } from "@/features/model/lib/normal";
import { formatOutcome } from "@/features/model/lib/outcome-format";
import { cn } from "@/lib/cn";

const OUTCOME_STEP = 0.1;

type OutcomeSliderProps = {
  readonly value: number;
  readonly domain: OutcomeDomain;
  readonly unit: string;
  readonly onChange: (value: number) => void;
  readonly binaryPaysUsd: number;
  readonly curvePaysUsd: number;
};

function Readout({ label, amountUsd, lead }: { label: string; amountUsd: number; lead: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <span className="text-small text-text-muted">{label}</span>
      <output className={cn("tabular text-body", lead ? "text-signal" : "text-text")}>
        {formatUsd(amountUsd)}
      </output>
    </div>
  );
}

export function OutcomeSlider(props: OutcomeSliderProps) {
  const { value, domain, unit, onChange, binaryPaysUsd, curvePaysUsd } = props;
  const id = useId();
  const shown = `${formatOutcome(value)} ${unit}`;
  return (
    <div className="border-t border-border py-3">
      <label
        htmlFor={id}
        className="flex items-baseline justify-between gap-2 text-small text-text-muted"
      >
        {modelCopy.decision.sliderLabel}
        <span className="tabular text-text">{shown}</span>
      </label>
      <input
        id={id}
        type="range"
        min={domain.lo}
        max={domain.hi}
        step={OUTCOME_STEP}
        value={value}
        aria-valuetext={shown}
        onChange={(event) => onChange(Number(event.target.value))}
        className="model-outcome-slider h-10 w-full cursor-ew-resize accent-accent"
      />
      <div className="grid gap-x-4 gap-y-1 border-t border-border pt-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Readout
          label={modelCopy.decision.binaryPays}
          amountUsd={binaryPaysUsd}
          lead={binaryPaysUsd > curvePaysUsd}
        />
        <Readout
          label={modelCopy.decision.curvePays}
          amountUsd={curvePaysUsd}
          lead={curvePaysUsd >= binaryPaysUsd && curvePaysUsd > 0}
        />
      </div>
    </div>
  );
}
