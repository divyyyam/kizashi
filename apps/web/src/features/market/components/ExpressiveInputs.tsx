import { sigmaBounds } from "@kizashi/core";
import { copy } from "@/content/copy";
import { formatGrid } from "@/lib/format";
import type { BetDraft, MarketDetail } from "../types";

type Props = {
  market: MarketDetail;
  draft: BetDraft;
  patch: (patch: Partial<BetDraft>) => void;
  id: string;
};

export function ExpressiveInputs({ market, draft, patch, id }: Props) {
  const width = sigmaBounds(market.grid);
  const fields = [
    {
      key: "mean",
      label: copy.market.mean,
      help: copy.market.meanHelp,
      min: market.grid.lo,
      max: market.grid.lo + market.grid.w * BigInt(market.grid.n),
    },
    {
      key: "sigma",
      label: copy.market.width,
      help: copy.market.widthHelp,
      min: width.min,
      max: width.max,
    },
  ] as const;
  return (
    <div className="expressive-inputs">
      {fields.map(({ key, label, help, min, max }) => (
        <label key={key} htmlFor={`${id}-${key}`} className="shape-field">
          <span className="shape-field-heading">
            <span>{label}</span>
            <output htmlFor={`${id}-${key}`}>
              {formatGrid(draft[key], market.precision)} <small>{market.unit}</small>
            </output>
          </span>
          <input
            id={`${id}-${key}`}
            type="range"
            min={min.toString()}
            max={max.toString()}
            step="1"
            value={draft[key].toString()}
            aria-describedby={`${id}-${key}-help`}
            aria-valuetext={`${formatGrid(draft[key], market.precision)} ${market.unit}`}
            onChange={(event) => patch({ [key]: BigInt(event.target.value) })}
          />
          <span id={`${id}-${key}-help`} className="shape-field-help">
            {help}
          </span>
        </label>
      ))}
    </div>
  );
}
