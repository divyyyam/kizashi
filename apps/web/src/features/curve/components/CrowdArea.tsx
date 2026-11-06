import { curveMonotoneX } from "@visx/curve";
import { Area, LinePath } from "@visx/shape";
import { memo } from "react";

type Point = { x: number; y: number };
export const CrowdArea = memo(function CrowdArea({
  points,
  baseline,
}: {
  points: Point[];
  baseline: number;
}) {
  return (
    <>
      <Area
        data={points}
        x={(p) => p.x}
        y0={baseline}
        y1={(p) => p.y}
        curve={curveMonotoneX}
        className="fill-curve-crowd"
      />
      <LinePath
        data={points}
        x={(p) => p.x}
        y={(p) => p.y}
        curve={curveMonotoneX}
        className="fill-none stroke-text-muted"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
    </>
  );
});
