import { gaussianDisplay } from "@kizashi/core";
import type { CurveGrid, CurveParams } from "../types";
export const CHART_PADDING = { left: 16, right: 16, top: 32, bottom: 48 };
const GEOMETRY_SCALE = 1_000_000;
export function draftDistribution(grid: CurveGrid, value?: CurveParams): number[] {
  return value
    ? gaussianDisplay(
        {
          lo: BigInt(Math.round(grid.lo * GEOMETRY_SCALE)),
          w: BigInt(Math.round(grid.width * GEOMETRY_SCALE)),
          n: grid.count,
        },
        value.mean * GEOMETRY_SCALE,
        value.sigma * GEOMETRY_SCALE,
      )
    : [];
}
export function curveGeometry(options: {
  grid: CurveGrid;
  width: number;
  height: number;
  crowd: readonly number[];
  draft: readonly number[];
}) {
  const { grid, width, height, crowd, draft } = options;
  const plotWidth = Math.max(1, width - CHART_PADDING.left - CHART_PADDING.right);
  const baseline = height - CHART_PADDING.bottom;
  const max = Math.max(...crowd, ...draft, 1 / grid.count) * 1.15;
  const x = (value: number) =>
    CHART_PADDING.left + ((value - grid.lo) / (grid.width * grid.count)) * plotWidth;
  const y = (value: number) => baseline - (value / max) * (baseline - CHART_PADDING.top);
  const inverseX = (pixel: number) =>
    grid.lo + ((pixel - CHART_PADDING.left) / plotWidth) * grid.width * grid.count;
  const points = (values: readonly number[]) =>
    values.map((p, i) => ({ x: x(grid.lo + (i + 0.5) * grid.width), y: y(p) }));
  return { x, y, inverseX, baseline, points, plotWidth };
}
export type Geometry = ReturnType<typeof curveGeometry>;
