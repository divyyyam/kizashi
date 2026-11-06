import { curveMonotoneX } from "@visx/curve";
import { LinePath } from "@visx/shape";
export function DraftCurve({ points }: { points: { x: number; y: number }[] }) {
  return (
    <LinePath
      data={points}
      x={(p) => p.x}
      y={(p) => p.y}
      curve={curveMonotoneX}
      className="fill-none stroke-curve-user"
      strokeWidth={2.5}
    />
  );
}
