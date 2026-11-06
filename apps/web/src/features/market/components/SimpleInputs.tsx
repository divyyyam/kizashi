import { copy } from "@/content/copy";
import { formatGrid } from "@/lib/format";
import type { BetDraft, MarketDetail } from "../types";
export function SimpleInputs({
  market,
  draft,
  patch,
  id,
}: {
  market: MarketDetail;
  draft: BetDraft;
  patch: (patch: Partial<BetDraft>) => void;
  id: string;
}) {
  return (
    <>
      {" "}
      {draft.mode === "simple" ? (
        <>
          <fieldset aria-label={copy.market.direction} className="grid grid-cols-2 gap-2">
            {(["above", "below"] as const).map((direction) => (
              <button
                type="button"
                key={direction}
                aria-pressed={draft.direction === direction}
                onClick={() => patch({ direction })}
                className={`h-10 rounded-sm border text-small ${draft.direction === direction ? "bg-surface-raised text-text" : "text-text-muted"}`}
              >
                {copy.market[direction]}
              </button>
            ))}
          </fieldset>
          <label
            htmlFor={`${id}-threshold`}
            className="flex flex-col gap-3 text-small text-text-muted"
          >
            {copy.market.threshold}
            <output className="tabular text-text">
              {formatGrid(
                market.grid.lo + BigInt(draft.threshold) * market.grid.w,
                market.precision,
              )}{" "}
              {market.unit}
            </output>
            <input
              id={`${id}-threshold`}
              type="range"
              min={1}
              max={market.grid.n - 1}
              step={1}
              value={draft.threshold}
              onChange={(event) => patch({ threshold: Number(event.target.value) })}
              className="h-10 w-full accent-accent"
            />
          </label>
        </>
      ) : null}
    </>
  );
}
