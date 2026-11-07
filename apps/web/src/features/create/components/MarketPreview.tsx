"use client";

import { bFromSubsidy, lossBound, toWad } from "@kizashi/core";
import { parseUnits } from "viem";
import { copy } from "@/content/copy";
import { formatWad } from "@/lib/format";
import { type CreateFormValues, gridOf, splitTags } from "../types";
import { PreviewFacts } from "./PreviewFacts";
import { PreviewOutcomes } from "./PreviewOutcomes";

/** Live card showing how the market will look and what the creator risks. */
export function MarketPreview({ values }: { values: CreateFormValues }) {
  const grid = gridOf(values);
  const n = grid ? Number(grid.n) : undefined;
  let risk: { maxLoss: string; start: string } | undefined;
  try {
    if (grid && /^\d+(\.\d{1,6})?$/.test(values.subsidy) && Number(values.subsidy) >= 1) {
      const b = bFromSubsidy(toWad(parseUnits(values.subsidy, 6)), Number(grid.n));
      risk = {
        maxLoss: formatWad(lossBound(b, Number(grid.n))),
        start: (100 / Number(grid.n)).toFixed(1),
      };
    }
  } catch {
    risk = undefined;
  }
  const close = Date.parse(values.closesAt);
  const tags = splitTags(values.tags);
  return (
    <aside className="grid min-w-0 content-start gap-5 rounded-xl border border-border bg-surface p-5 text-small md:p-6">
      <p className="text-text-faint">{copy.create.card}</p>
      <div className="flex gap-4">
        <div className="grid min-w-0 gap-1 break-words">
          <p className="text-text-faint capitalize">{values.category}</p>
          <p className="text-body text-text">{values.question || copy.create.unnamed}</p>
        </div>
      </div>
      <PreviewOutcomes values={values} count={n} probability={risk?.start} />
      <PreviewFacts
        close={close}
        source={values.source}
        subsidy={values.subsidy}
        maxLoss={risk?.maxLoss}
      />
      {tags.length ? (
        <ul className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <li key={t} className="rounded-full border border-border px-2 py-0.5 text-text-muted">
              #{t}
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}
