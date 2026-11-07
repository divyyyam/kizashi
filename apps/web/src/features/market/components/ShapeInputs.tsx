import { copy } from "@/content/copy";
import type { BetDraft, MarketDetail } from "../types";
import { ExpressiveInputs } from "./ExpressiveInputs";
import { SimpleInputs } from "./SimpleInputs";
export function ShapeInputs({
  market,
  draft,
  patch,
  switchMode,
  id,
}: {
  market: MarketDetail;
  draft: BetDraft;
  patch: (patch: Partial<BetDraft>) => void;
  switchMode: (mode: BetDraft["mode"]) => void;
  id: string;
}) {
  return (
    <>
      {market.kind === "expressive" ? (
        <fieldset aria-label={copy.market.modes} className="bet-mode">
          {(["simple", "expressive"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={draft.mode === mode}
              onClick={() => switchMode(mode)}
            >
              {copy.market[mode]}
            </button>
          ))}
        </fieldset>
      ) : null}
      {draft.mode === "expressive" ? (
        <ExpressiveInputs market={market} draft={draft} patch={patch} id={id} />
      ) : (
        <SimpleInputs market={market} draft={draft} patch={patch} id={id} />
      )}
    </>
  );
}
