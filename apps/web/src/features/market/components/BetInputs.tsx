import { useId } from "react";
import { copy } from "@/content/copy";
import type { BetDraft, MarketDetail } from "../types";
import { ShapeInputs } from "./ShapeInputs";
export function BetInputs({
  market,
  draft,
  patch,
  switchMode,
}: {
  market: MarketDetail;
  draft: BetDraft;
  patch: (patch: Partial<BetDraft>) => void;
  switchMode: (mode: BetDraft["mode"]) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-6">
      <ShapeInputs market={market} draft={draft} patch={patch} switchMode={switchMode} id={id} />
      <label htmlFor={`${id}-spend`} className="flex flex-col gap-3 text-small text-text-muted">
        {copy.market.spend}
        <input
          id={`${id}-spend`}
          aria-describedby={`${id}-spend-help`}
          aria-label={copy.market.spend}
          inputMode="decimal"
          autoComplete="off"
          value={draft.spend}
          onChange={(event) => patch({ spend: event.target.value })}
          className="h-12 w-full rounded-sm border bg-bg px-4 tabular text-h3 text-text"
        />
        <span id={`${id}-spend-help`}>{copy.market.spendHint}</span>
      </label>
    </div>
  );
}
