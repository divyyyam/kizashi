import { copy } from "@/content/copy";
import type { CrowdPoint } from "../lib/crowd-response";

const WIDTH = 640;
const HEIGHT = 140;
const PADDING = 8;

export function CrowdHistoryChart({ points }: { points: readonly CrowdPoint[] }) {
  const first = points[0];
  const last = points.at(-1);
  const span = first && last ? Math.max(1, last.tsSec - first.tsSec) : 1;
  const coordinates = points.map((point) => ({
    key: point.entityKey,
    x:
      PADDING +
      (points.length === 1 ? 0.5 : (point.tsSec - (first?.tsSec ?? 0)) / span) *
        (WIDTH - 2 * PADDING),
    y: PADDING + (1 - point.topProbabilityPpm / 1_000_000) * (HEIGHT - 2 * PADDING),
  }));
  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={copy.feedback.history.chart}
        className="w-full text-signal"
      >
        {coordinates.length > 1 ? (
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            points={coordinates.map((point) => `${point.x},${point.y}`).join(" ")}
          />
        ) : null}
        {coordinates.map((point) => (
          <circle key={point.key} cx={point.x} cy={point.y} r={3} fill="currentColor" />
        ))}
      </svg>
      {last ? (
        <p className="text-small text-text-muted">
          {copy.feedback.history.summary(
            points.length,
            `${(last.topProbabilityPpm / 10_000).toFixed(1)}%`,
            String(last.topBucket),
          )}
        </p>
      ) : null}
    </div>
  );
}
