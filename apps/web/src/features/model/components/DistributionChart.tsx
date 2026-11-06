import { cn } from "@/lib/cn";
import { chartBox, densityArea, densityLine, densityToChart, xToChart } from "../lib/chart-path";
import { type NormalView, normalPdf, type OutcomeDomain } from "../lib/normal";

const SIZES = {
  mini: { width: 240, height: 56, className: "h-16" },
  large: { width: 640, height: 240, className: "model-distribution h-44" },
} as const;

type DistributionChartProps = {
  readonly size: keyof typeof SIZES;
  readonly domain: OutcomeDomain;
  readonly crowd: NormalView;
  readonly engine: NormalView | null;
  readonly label: string;
  readonly threshold?: number;
  /** An outcome to mark on the engine curve, such as the slider's value. */
  readonly marker?: number;
};

/**
 * Crowd curve (filled, muted) with the engine's curve drawn over it in the signal colour.
 * The crowd layer is drawn against its own peak and scaled down when the engine curve arrives,
 * so the change of scale animates instead of jumping.
 */
export function DistributionChart(props: DistributionChartProps) {
  const { size, domain, crowd, engine, label, threshold, marker } = props;
  const { className, ...frame } = SIZES[size];
  const box = chartBox(frame, domain, engine === null ? [crowd] : [crowd, engine]);
  const crowdBox = chartBox(frame, domain, [crowd]);
  const crowdScale = crowdBox.peak / box.peak;
  const viewBox = `0 0 ${frame.width} ${frame.height}`;
  const stroke = { vectorEffect: "non-scaling-stroke", fill: "none" } as const;
  const markerPoint =
    marker === undefined || engine === null
      ? null
      : {
          x: xToChart(marker, box),
          left: (xToChart(marker, box) / frame.width) * 100,
          top: (densityToChart(normalPdf(marker, engine), box) / frame.height) * 100,
        };
  return (
    <div role="img" aria-label={label} className={cn("relative w-full", className)}>
      <svg
        viewBox={viewBox}
        preserveAspectRatio="none"
        aria-hidden
        className="absolute inset-0 size-full overflow-visible"
      >
        <g
          className="transition-transform duration-(--motion-reveal) ease-out-soft"
          style={{
            transform: `scaleY(${crowdScale})`,
            transformOrigin: "50% 100%",
            transformBox: "view-box",
          }}
        >
          <path d={densityArea(crowd, crowdBox)} className="fill-curve-crowd" />
          <path
            d={densityLine(crowd, crowdBox)}
            {...stroke}
            className="stroke-text-faint"
            strokeWidth={1.2}
          />
        </g>
        {threshold === undefined ? null : (
          <line
            x1={xToChart(threshold, box)}
            x2={xToChart(threshold, box)}
            y1={0}
            y2={frame.height}
            {...stroke}
            className="stroke-text-muted"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        )}
        {markerPoint === null ? null : (
          <line
            x1={markerPoint.x}
            x2={markerPoint.x}
            y1={0}
            y2={frame.height}
            {...stroke}
            className="stroke-border-strong"
            strokeWidth={1}
          />
        )}
      </svg>
      {engine === null ? null : (
        <div className="model-draw absolute inset-0">
          <svg
            aria-hidden
            viewBox={viewBox}
            preserveAspectRatio="none"
            className="size-full overflow-visible"
          >
            <path
              d={densityLine(engine, box)}
              {...stroke}
              className="stroke-signal"
              strokeWidth={size === "large" ? 2.2 : 1.6}
            />
          </svg>
        </div>
      )}
      {markerPoint === null ? null : (
        <span
          aria-hidden
          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-signal"
          style={{ left: `${markerPoint.left}%`, top: `${markerPoint.top}%` }}
        />
      )}
    </div>
  );
}
