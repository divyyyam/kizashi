"use client";
import { useMemo } from "react";
import { useCrowdMorph } from "../hooks/use-crowd-morph";
import { curveGeometry, draftDistribution } from "../lib/geometry";
import type { CurveEditorProps } from "../types";
import { BucketAxis } from "./BucketAxis";
import { CrowdArea } from "./CrowdArea";
import { DraftCurve } from "./DraftCurve";
import { Handles } from "./Handles";

export function CurveCanvas(props: CurveEditorProps & { width: number; canvasHeight: number }) {
  const { grid, crowdPrices, value, onChange, highlight, width, canvasHeight } = props;
  const crowd = useCrowdMorph(crowdPrices);
  const draft = useMemo(() => draftDistribution(grid, value), [grid, value]);
  const geometry = curveGeometry({ grid, width, height: canvasHeight, crowd, draft });
  const crowdPoints = useMemo(() => geometry.points(crowd), [geometry, crowd]);
  return (
    <svg
      width={width}
      height={canvasHeight}
      viewBox={`0 0 ${width} ${canvasHeight}`}
      role={onChange ? "group" : "img"}
      aria-label={props.ariaLabel}
      className="curve-surface overflow-visible"
    >
      <g className="stroke-border">
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1={geometry.x(grid.lo)}
            x2={geometry.x(grid.lo + grid.count * grid.width)}
            y1={geometry.baseline * fraction}
            y2={geometry.baseline * fraction}
            strokeDasharray="2 6"
          />
        ))}
        {value && (
          <line
            x1={geometry.x(value.mean)}
            x2={geometry.x(value.mean)}
            y1={geometry.y(Math.max(...draft))}
            y2={geometry.baseline}
            className="stroke-curve-user/60"
            strokeDasharray="3 5"
          />
        )}
      </g>
      {highlight ? (
        <rect
          x={geometry.x(grid.lo + highlight.fromBucket * grid.width)}
          y={32}
          width={((highlight.toBucket - highlight.fromBucket) / grid.count) * geometry.plotWidth}
          height={geometry.baseline - 32}
          className="fill-curve-crowd"
        />
      ) : null}
      <CrowdArea points={crowdPoints} baseline={geometry.baseline} />
      {draft.length > 0 && <DraftCurve points={geometry.points(draft)} />}
      <BucketAxis grid={grid} geometry={geometry} width={width} />
      {value && onChange ? (
        <Handles
          grid={grid}
          value={value}
          geometry={geometry}
          peakY={geometry.y(Math.max(...draft))}
          onChange={onChange}
        />
      ) : null}
    </svg>
  );
}
