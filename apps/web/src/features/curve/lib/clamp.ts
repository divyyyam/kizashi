import { sigmaBounds } from "@kizashi/core";
import type { CurveGrid, CurveParams } from "../types";

const GEOMETRY_PRECISION = 1_000_000;
export function clampCurveParams(grid: CurveGrid, params: CurveParams): CurveParams {
  const scaled = {
    lo: BigInt(Math.round(grid.lo * GEOMETRY_PRECISION)),
    w: BigInt(Math.round(grid.width * GEOMETRY_PRECISION)),
    n: grid.count,
  };
  const { min, max } = sigmaBounds(scaled);
  return {
    mean: Math.max(grid.lo, Math.min(grid.lo + grid.width * grid.count, params.mean)),
    sigma: Math.max(
      Number(min) / GEOMETRY_PRECISION,
      Math.min(Number(max) / GEOMETRY_PRECISION, params.sigma),
    ),
  };
}
