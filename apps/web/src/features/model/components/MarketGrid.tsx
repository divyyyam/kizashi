"use client";

import { useId, useState } from "react";
import { modelCopy } from "@/content/model-copy";
import { activeStep, type RunState } from "../lib/run-reducer";
import { RunMarketCard } from "./RunMarketCard";

type MarketGridProps = {
  readonly state: RunState;
};

/** Cards drop in as the engine finds markets; the sweep runs over each until it is priced. */
export function MarketGrid({ state }: MarketGridProps) {
  const id = useId();
  const [nowSec] = useState(() => Math.floor(Date.now() / 1000));
  const pricing = activeStep(state) === "pricing";
  const pickId = state.decision?.marketId ?? null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={id} className="text-label text-text-faint">
          {modelCopy.canvas.title}
        </h2>
        <span className="tabular text-small text-text-faint">{state.markets.length}</span>
      </div>
      {state.markets.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-8 text-small text-text-muted">
          {modelCopy.canvas.waiting}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {state.markets.map((entry) => (
            <li key={entry.market.id} className="model-drop">
              <RunMarketCard
                entry={entry}
                sweeping={pricing && entry.engine === null}
                isPick={entry.market.id === pickId}
                nowSec={nowSec}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
