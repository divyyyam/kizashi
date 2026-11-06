import type { CurveGrid, CurveParams } from "../types";
import { clampCurveParams } from "./clamp";
export function keyboardCurve(options: {
  key: string;
  shift: boolean;
  handle: "mean" | "sigma";
  grid: CurveGrid;
  value: CurveParams;
}): CurveParams | undefined {
  const { key, shift, handle, grid, value } = options;
  const field = shift && key.startsWith("Arrow") ? "sigma" : handle;
  // A keyboard increment must survive conversion to the market's displayed precision.
  const step = Math.max(10 ** -grid.precision, grid.width * (field === "mean" ? 1 : 0.25));
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(key)) return;
  const next =
    key === "Home"
      ? -Infinity
      : key === "End"
        ? Infinity
        : value[field] + (["ArrowLeft", "ArrowDown"].includes(key) ? -step : step);
  return clampCurveParams(grid, { ...value, [field]: next });
}
