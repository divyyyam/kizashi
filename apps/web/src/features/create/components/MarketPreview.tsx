"use client";

import { bFromSubsidy, lossBound, toWad } from "@kizashi/core";
import { parseUnits } from "viem";
import type { PreparedImage } from "../lib/image";
import { type CreateFormValues, gridOf, splitTags } from "../types";

const WAD = 10n ** 18n;

function usd(wad: bigint): string {
  return (Number((wad * 100n) / WAD) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Live card showing how the market will look and what the creator risks. */
export function MarketPreview({
  values,
  image,
}: {
  values: CreateFormValues;
  image: PreparedImage | undefined;
}) {
  const grid = gridOf(values);
  const n = grid ? Number(grid.n) : undefined;
  let risk: { maxLoss: string; start: string } | undefined;
  try {
    if (grid && /^\d+(\.\d{1,6})?$/.test(values.subsidy) && Number(values.subsidy) >= 1) {
      const b = bFromSubsidy(toWad(parseUnits(values.subsidy, 6)), Number(grid.n));
      risk = {
        maxLoss: usd(lossBound(b, Number(grid.n))),
        start: (100 / Number(grid.n)).toFixed(1),
      };
    }
  } catch {
    risk = undefined;
  }
  const close = Date.parse(values.closesAt);
  const tags = splitTags(values.tags);
  return (
    <aside className="grid content-start gap-4 rounded-lg border border-border bg-surface p-5 text-small">
      <p className="text-text-faint">Preview</p>
      <div className="flex gap-4">
        <div className="size-16 shrink-0 overflow-hidden rounded-md border border-border bg-bg">
          {/* biome-ignore lint/performance/noImgElement: local blob preview */}
          {image ? <img src={image.url} alt="" className="size-full object-cover" /> : null}
        </div>
        <div className="grid gap-1">
          <p className="text-text-faint capitalize">{values.category}</p>
          <p className="text-body text-text">{values.question || "Your question appears here"}</p>
        </div>
      </div>
      {values.kind === "binary" ? (
        <div className="grid grid-cols-2 gap-2">
          {[values.yesLabel || "Yes", values.noLabel || "No"].map((label) => (
            <div
              key={label}
              className="flex justify-between rounded-md border border-border px-3 py-2"
            >
              <span>{label}</span>
              <span className="tabular text-text-muted">50%</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-text-muted">
          {n
            ? `${n} ranges from ${values.low} to ${values.high} ${values.unit}, ${risk?.start ?? "—"}% each to start`
            : "Set a range to see the buckets"}
        </p>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-4">
        <dt className="text-text-faint">Closes</dt>
        <dd className="tabular">
          {Number.isFinite(close) ? new Date(close).toLocaleString() : "—"}
        </dd>
        <dt className="text-text-faint">Resolution</dt>
        <dd>{values.source === "manual" ? "Resolver + 30 min disputes" : "Uniswap v4 TWAP"}</dd>
        <dt className="text-text-faint">Liquidity</dt>
        <dd className="tabular">{values.subsidy || "—"} USDC</dd>
        <dt className="text-text-faint">Your max loss</dt>
        <dd className="tabular">{risk ? `${risk.maxLoss} USDC` : "—"}</dd>
      </dl>
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
