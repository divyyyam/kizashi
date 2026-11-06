import type { ReactNode } from "react";
import { modelCopy } from "@/content/model-copy";
import { compareBets, type PricingInput } from "@/features/model/lib/pricing";
import type { RunState, Settlement } from "@/features/model/lib/run-reducer";
import type { RunMarket, RunRequest } from "@/features/model/types";
import { ActionBar } from "./ActionBar";
import { CollateralPanel } from "./CollateralPanel";
import { DecisionPanel } from "./DecisionPanel";
import { MarketGrid } from "./MarketGrid";
import { ModelCanvas } from "./ModelCanvas";

type PickPanelsProps = {
  readonly context: ReactNode;
  readonly focused: boolean;
  readonly state: RunState;
  readonly request: RunRequest;
  readonly onSettle: (settlement: Settlement) => void;
};

function pickedMarket(state: RunState): { market: RunMarket; input: PricingInput } | null {
  const decision = state.decision;
  if (decision === null) return null;
  const entry = state.markets.find((candidate) => candidate.market.id === decision.marketId);
  if (entry === undefined || entry.engine === null) return null;
  const { market, engine } = entry;
  return { market, input: { ...market, engine, stakeUsd: decision.stakeUsd } };
}

export function PickPanels({ state, request, onSettle, context, focused }: PickPanelsProps) {
  const picked = pickedMarket(state);
  const comparison = picked ? compareBets(picked.input) : null;
  const ready = picked !== null && comparison !== null;
  return (
    <section
      aria-label={modelCopy.workspace.views}
      className="model-workbench flex min-h-0 min-w-0 flex-1 flex-col"
    >
      <ModelCanvas
        focused={focused}
        panels={{
          context,
          analysis: ready ? (
            <DecisionPanel market={picked.market} input={picked.input} comparison={comparison} />
          ) : (
            <p role="status" className="p-6 text-small text-text-muted">
              {modelCopy.workspace.waiting}
            </p>
          ),
          markets: <MarketGrid state={state} />,
          collateral:
            ready && state.held !== null ? (
              <CollateralPanel input={picked.input} comparison={comparison} held={state.held} />
            ) : (
              <p className="p-6 text-small text-text-muted">{modelCopy.workspace.waiting}</p>
            ),
        }}
      />
      {ready && state.status === "finished" ? (
        <ActionBar
          mode={request.mode}
          pick={comparison.pick}
          stakeUsd={picked.input.stakeUsd}
          settlement={state.settlement}
          onSettle={onSettle}
        />
      ) : (
        <p role="status" className="border-t border-border px-4 py-3 text-small text-text-muted">
          {modelCopy.workspace.waiting}
        </p>
      )}
    </section>
  );
}
