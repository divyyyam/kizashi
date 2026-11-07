import { formatUnit } from "@/lib/format";
import { axisTicks } from "../lib/axis-ticks";
import type { Geometry } from "../lib/geometry";
import type { CurveGrid } from "../types";
export function BucketAxis({
  grid,
  geometry,
  width,
}: {
  grid: CurveGrid;
  geometry: Geometry;
  width: number;
}) {
  const labelCharacters = Math.max(
    ...[grid.lo, grid.lo + grid.count * grid.width].map(
      (value) => formatUnit(value, grid.precision).length,
    ),
  );
  const ticks = axisTicks({ count: grid.count, width: geometry.plotWidth, labelCharacters });
  const edges = Array.from({ length: grid.count + 1 }, (_, i) => ({
    value: grid.lo + i * grid.width,
    index: i,
  }));
  return (
    <g className="text-text-muted tabular text-small">
      <line
        x1={geometry.x(grid.lo)}
        x2={geometry.x(grid.lo + grid.count * grid.width)}
        y1={geometry.baseline}
        y2={geometry.baseline}
        className="stroke-border"
      />
      {edges.map(({ value, index: i }) => (
        <g
          key={value}
          transform={`translate(${geometry.x(grid.lo + i * grid.width)},${geometry.baseline})`}
        >
          <line y2={4} className="stroke-border" />
          {ticks.has(i) ? (
            <text
              y={24}
              textAnchor={i === 0 ? "start" : i === grid.count ? "end" : "middle"}
              fill="currentColor"
            >
              {formatUnit(grid.lo + i * grid.width, grid.precision)}
            </text>
          ) : null}
        </g>
      ))}
      <text x={width / 2} y={geometry.baseline + 44} textAnchor="middle" fill="currentColor">
        {grid.unit}
      </text>
    </g>
  );
}
