"use client";

import { ExternalLink, ShieldCheck } from "lucide-react";
import type { DataState } from "@/lib/data-state";
import type { MarketMetaView } from "./use-market-metadata";

function formatTime(sec: number) {
  return new Date(sec * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Image, description, outcomes and full resolution rules, with proof links. */
export function MarketMetaPanel({ state }: { state: DataState<MarketMetaView> }) {
  if (state.status === "loading") return null;
  if (state.status !== "ready") {
    const text =
      state.status === "empty"
        ? "This market was created without published rules metadata."
        : state.status === "error"
          ? `Warning: ${state.message}`
          : state.reason;
    return (
      <p
        role="status"
        className={`text-small ${state.status === "error" ? "text-negative" : "text-text-muted"}`}
      >
        {text}
      </p>
    );
  }
  const { metadata: m, imageUrl, metadataUrl, listing } = state.data;
  const r = m.resolution;
  return (
    <section className="grid gap-6 rounded-lg border border-border bg-surface p-5 text-small md:grid-cols-[auto_minmax(0,1fr)]">
      {imageUrl ? (
        // biome-ignore lint/performance/noImgElement: IPFS gateway image, dimensions in metadata
        <img
          src={imageUrl}
          alt=""
          width={m.image?.width}
          height={m.image?.height}
          className="size-28 rounded-md border border-border object-cover"
        />
      ) : null}
      <div className="grid content-start gap-4">
        <div className="flex flex-wrap items-center gap-2 text-text-faint">
          <span className="capitalize">{m.category}</span>
          {m.tags.map((t) => (
            <span key={t} className="rounded-full border border-border px-2 py-0.5">
              #{t}
            </span>
          ))}
        </div>
        {m.description ? (
          <p className="whitespace-pre-line text-text-muted">{m.description}</p>
        ) : null}
        {m.outcomes.kind === "binary" ? (
          <p>
            Outcomes: <strong>{m.outcomes.yes}</strong> / <strong>{m.outcomes.no}</strong>
          </p>
        ) : (
          <p>
            Range: {m.outcomes.low}–{m.outcomes.high} {m.outcomes.unit} in {m.outcomes.buckets}{" "}
            ranges
          </p>
        )}
        <div className="grid gap-2 border-t border-border pt-4">
          <h2 className="text-label text-text-muted">Resolution</h2>
          <p className="whitespace-pre-line">{r.criteria}</p>
          {r.edgeCases ? (
            <p className="whitespace-pre-line text-text-muted">Edge cases: {r.edgeCases}</p>
          ) : null}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-text-faint">Source</dt>
            <dd>
              {r.sourceUrl ? (
                <a
                  href={r.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-signal underline-offset-4 hover:underline"
                >
                  {r.sourceName}
                </a>
              ) : (
                r.sourceName
              )}
            </dd>
            <dt className="text-text-faint">Method</dt>
            <dd>
              {r.source === "uniswap-twap"
                ? "Uniswap v4 TWAP oracle, falls back to the resolver if the pool lacks swaps or liquidity"
                : `Resolver proposes after close; ${Math.round(r.disputeWindowSec / 60)}-minute dispute window`}
            </dd>
            <dt className="text-text-faint">Closes</dt>
            <dd className="tabular">{formatTime(m.closeTimeSec)}</dd>
          </dl>
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4 text-text-muted">
          <span className="inline-flex items-center gap-1 text-positive">
            <ShieldCheck aria-hidden size={15} /> Rules match the on-chain hash
          </span>
          <a
            href={metadataUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-text"
          >
            IPFS <ExternalLink aria-hidden size={13} />
          </a>
          <a
            href={listing.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-text"
          >
            Arkiv listing <ExternalLink aria-hidden size={13} />
          </a>
        </div>
      </div>
    </section>
  );
}
