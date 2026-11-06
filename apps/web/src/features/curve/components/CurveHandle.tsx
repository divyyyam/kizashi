"use client";
import { useHandleSpring } from "@/components/motion/use-handle-spring";
import { copy } from "@/content/copy";
import { formatUnit } from "@/lib/format";
import { useHandleEvents } from "../hooks/use-handle-events";
import { clampCurveParams } from "../lib/clamp";
import type { HandlesProps } from "./Handles";
export function CurveHandle({
  grid,
  value,
  geometry,
  peakY,
  onChange,
  handle,
}: HandlesProps & { handle: "left" | "mean" | "right" }) {
  const field = handle === "mean" ? "mean" : "sigma";
  const { ink, settle } = useHandleSpring();
  const { dragging, onPointerUp, ...events } = useHandleEvents({
    grid,
    value,
    geometry,
    onChange,
    field,
  });
  const limits = clampCurveParams(grid, { mean: Infinity, sigma: Infinity });
  const xValue =
    handle === "mean" ? value.mean : value.mean + (handle === "left" ? -value.sigma : value.sigma);
  const x = Math.max(
    20,
    Math.min(geometry.x(grid.lo + grid.count * grid.width) - 4, geometry.x(xValue)),
  );
  const y = handle === "mean" ? peakY : geometry.baseline - 24;
  return (
    <g
      role="slider"
      tabIndex={0}
      aria-label={
        handle === "mean"
          ? copy.curve.mean
          : handle === "left"
            ? copy.curve.widthLeft
            : copy.curve.widthRight
      }
      aria-valuemin={field === "mean" ? grid.lo : grid.width / 2}
      aria-valuemax={limits[field]}
      aria-valuenow={value[field]}
      aria-valuetext={copy.curve.value(formatUnit(value[field], grid.precision), grid.unit)}
      transform={`translate(${x},${y})`}
      className="curve-handle touch-none cursor-ew-resize"
      data-dragging={dragging}
      onPointerCancel={onPointerUp}
      onPointerUp={(event) => {
        onPointerUp(event);
        settle();
      }}
      {...events}
    >
      <circle r={24} className="fill-transparent" />
      <g ref={ink} className="handle-ink">
        <circle
          r={handle === "mean" ? 11 : 7}
          className="fill-bg stroke-curve-user"
          strokeWidth={1.5}
        />
        <circle r={handle === "mean" ? 4 : 2.5} className="fill-curve-user" />
      </g>
      <g className="drag-pill" pointerEvents="none" aria-hidden>
        <rect x={-23} y={-36} width={46} height={18} rx={9} className="fill-text" />
        <text textAnchor="middle" y={-23} className="fill-bg text-label">
          {copy.motion.drag}
        </text>
      </g>
    </g>
  );
}
