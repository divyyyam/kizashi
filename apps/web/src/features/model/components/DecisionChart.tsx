import { useState } from "react";
import { modelCopy } from "@/content/model-copy";
import { formatOutcome } from "@/features/model/lib/outcome-format";
import {
  type BetComparison,
  binaryPayoutAt,
  curvePayoutAt,
  type PricingInput,
} from "@/features/model/lib/pricing";
import { ChartLegend } from "./ChartLegend";
import { DistributionChart } from "./DistributionChart";
import { OutcomeSlider } from "./OutcomeSlider";

type DecisionChartProps = {
  readonly input: PricingInput;
  readonly comparison: BetComparison;
  readonly unit: string;
};

export function DecisionChart({ input, comparison, unit }: DecisionChartProps) {
  const [outcome, setOutcome] = useState(input.engine.mean);
  const label = modelCopy.decision.chart(
    formatOutcome(input.crowd.mean),
    formatOutcome(input.engine.mean),
    formatOutcome(input.threshold),
    unit,
  );
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ChartLegend threshold={formatOutcome(input.threshold)} unit={unit} />
      <div className="model-chart rounded-md border border-border bg-bg px-3 pt-4 pb-2">
        <DistributionChart
          size="large"
          domain={input.domain}
          crowd={input.crowd}
          engine={input.engine}
          threshold={input.threshold}
          marker={outcome}
          label={label}
        />
        <div aria-hidden className="mt-2 flex justify-between tabular text-label text-text-faint">
          <span>{formatOutcome(input.domain.lo)}</span>
          <span>{unit}</span>
          <span>{formatOutcome(input.domain.hi)}</span>
        </div>
      </div>
      <OutcomeSlider
        value={outcome}
        domain={input.domain}
        unit={unit}
        onChange={setOutcome}
        binaryPaysUsd={binaryPayoutAt(outcome, comparison.binary, input.threshold)}
        curvePaysUsd={curvePayoutAt(outcome, input)}
      />
    </div>
  );
}
