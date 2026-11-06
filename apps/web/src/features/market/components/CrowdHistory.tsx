"use client";

import { useCrowdHistory } from "../hooks/use-crowd-history";

const W = 640;
const H = 140;
const PAD = 8;

/** Crowd history (Arkiv): the top outcome's probability at each recorded snapshot. */
export function CrowdHistory({ marketId }: { marketId: string }) {
  const state = useCrowdHistory(marketId);
  if (state.status === "loading") return null;
  const note =
    state.status === "empty"
      ? "No crowd snapshots have been recorded on Arkiv for this market yet."
      : state.status === "error"
        ? state.message
        : state.status === "unavailable"
          ? state.reason
          : undefined;
  const points = state.status === "ready" ? state.data : [];
  const first = points[0];
  const last = points.at(-1);
  const span = first && last ? Math.max(1, last.tsSec - first.tsSec) : 1;
  const coords = points.map((p) => ({
    x: PAD + (points.length === 1 ? 0.5 : (p.tsSec - (first?.tsSec ?? 0)) / span) * (W - 2 * PAD),
    y: PAD + (1 - p.topProbabilityPpm / 1_000_000) * (H - 2 * PAD),
  }));
  return (
    <section aria-label="Crowd history (Arkiv)" className="rounded-md border bg-surface p-4">
      <h2 className="text-sm font-medium">Crowd history (Arkiv)</h2>
      {note ? (
        <p role="status" className="mt-2 text-sm text-text-muted">
          {note}
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label="Top outcome probability over time"
            className="mt-3 w-full text-accent"
          >
            {coords.length > 1 ? (
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
              />
            ) : null}
            {coords.map((c, i) => (
              <circle key={points[i]?.entityKey} cx={c.x} cy={c.y} r={3} fill="currentColor" />
            ))}
          </svg>
          <p className="mt-2 text-xs text-text-muted">
            {points.length} snapshot{points.length === 1 ? "" : "s"}; latest top outcome{" "}
            {last ? `${(last.topProbabilityPpm / 10_000).toFixed(1)}%` : ""} on bucket{" "}
            {last ? last.topBucket : ""}.
          </p>
        </>
      )}
    </section>
  );
}
