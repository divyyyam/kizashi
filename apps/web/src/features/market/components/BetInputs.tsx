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
      <label htmlFor={`${id}-spend`} className="bet-spend">
        {copy.market.spend}
        <span className="spend-control">
          <input
            id={`${id}-spend`}
            aria-describedby={`${id}-spend-help`}
            aria-label={copy.market.spend}
            inputMode="decimal"
            autoComplete="off"
            value={draft.spend}
            onChange={(event) => patch({ spend: event.target.value })}
          />
          <span>{copy.market.unitUsdc}</span>
        </span>
        <span id={`${id}-spend-help`}>{copy.market.spendHint}</span>
      </label>
    </div>
  );
}
