import { copy } from "@/content/copy";
import type { BetDraft, MarketDetail } from "../types";
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
        <fieldset aria-label={copy.market.modes} className="grid grid-cols-2 rounded-sm border p-1">
          {(["simple", "expressive"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={draft.mode === mode}
              onClick={() => switchMode(mode)}
              className={`h-10 rounded-sm text-small transition-colors duration-120 ${draft.mode === mode ? "bg-accent text-accent-fg" : "text-text-muted hover:text-text"}`}
            >
              {copy.market[mode]}
            </button>
          ))}
        </fieldset>
      ) : null}
      <SimpleInputs market={market} draft={draft} patch={patch} id={id} />
    </>
  );
}
