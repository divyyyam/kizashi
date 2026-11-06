"use client";

import { ParentSize } from "@visx/responsive";
import { copy } from "@/content/copy";
import { formatPercent, formatUnit } from "@/lib/format";
import type { CurveEditorProps } from "../types";
import { CurveCanvas } from "./CurveCanvas";
export function CurveEditor(props: CurveEditorProps) {
  return (
    <figure className="min-w-0">
      <div
        className="h-chart w-full lg:h-chart-desktop"
        style={props.height === undefined ? undefined : { height: props.height }}
      >
        <ParentSize debounceTime={0}>
          {({ width, height }) =>
            width > 0 ? <CurveCanvas {...props} width={width} canvasHeight={height} /> : null
          }
        </ParentSize>
      </div>
      <figcaption className="sr-only">{curveSummary(props)}</figcaption>
    </figure>
  );
}

function curveSummary({ grid, crowdPrices, value }: CurveEditorProps): string {
  const peak = crowdPrices.indexOf(Math.max(...crowdPrices));
  let total = 0;
  let median = grid.lo;
  for (let i = 0; i < crowdPrices.length; i++) {
    total += crowdPrices[i] ?? 0;
    if (total >= 0.5) {
      median = grid.lo + (i + 0.5) * grid.width;
      break;
    }
  }
  const bucket =
    peak === 0
      ? copy.markets.lowerTail(formatUnit(grid.lo + grid.width, grid.precision), grid.unit)
      : peak === grid.count - 1
        ? copy.markets.upperTail(formatUnit(grid.lo + peak * grid.width, grid.precision), grid.unit)
        : copy.markets.range(
            formatUnit(grid.lo + peak * grid.width, grid.precision),
            formatUnit(grid.lo + (peak + 1) * grid.width, grid.precision),
            grid.unit,
          );
  return (
    copy.curve.summary(
      bucket,
      formatPercent(BigInt(Math.round((crowdPrices[peak] ?? 0) * 1e18))),
      copy.curve.value(formatUnit(median, grid.precision), grid.unit),
    ) +
    (value
      ? ` ${copy.curve.draft(formatUnit(value.mean, grid.precision), formatUnit(value.sigma, grid.precision), grid.unit)}`
      : "")
  );
}
