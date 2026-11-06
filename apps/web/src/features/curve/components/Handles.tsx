"use client";

import type { Geometry } from "../lib/geometry";
import type { CurveGrid, CurveParams } from "../types";
import { CurveHandle } from "./CurveHandle";

export type HandlesProps = {
  grid: CurveGrid;
  value: CurveParams;
  geometry: Geometry;
  peakY: number;
  onChange: (value: CurveParams) => void;
};
export function Handles(props: HandlesProps) {
  return (
    <g>
      {(["left", "mean", "right"] as const).map((handle) => (
        <CurveHandle key={handle} {...props} handle={handle} />
      ))}
    </g>
  );
}
