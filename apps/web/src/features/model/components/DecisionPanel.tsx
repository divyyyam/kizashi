"use client";

import { useId } from "react";
import { modelCopy } from "@/content/model-copy";
import type { BetComparison, PricingInput } from "@/features/model/lib/pricing";
import type { RunMarket } from "@/features/model/types";
import { DecisionChart } from "./DecisionChart";
import { OptionCards } from "./OptionCards";

type DecisionPanelProps = {
  readonly market: RunMarket;
  readonly input: PricingInput;
  readonly comparison: BetComparison;
};

export function DecisionPanel({ market, input, comparison }: DecisionPanelProps) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="model-rise flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-label text-signal">
          {modelCopy.decision.eyebrow} <span className="text-text-faint">/ {market.tag}</span>
        </p>
        <h2 id={id} className="font-display text-3xl leading-tight text-text">
          {market.question}
        </h2>
      </div>
      <div className="model-decision-grid grid min-w-0 gap-5">
        <DecisionChart input={input} comparison={comparison} unit={market.unit} />
        <OptionCards market={market} input={input} comparison={comparison} />
      </div>
    </section>
  );
}
