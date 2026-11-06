"use client";

import { type KeyboardEvent, type PointerEvent, useRef } from "react";
import { copy } from "@/content/copy";
import { bucketPoints, type Frame, smoothArea, smoothLine } from "../lib/curve-path";
import { clampMean, HERO_HIGH, HERO_LOW, type HeroCurve, MEAN_STEP } from "../lib/hero-grid";

// viewBox units; the SVG scales to the card width.
const FRAME: Frame = { width: 640, height: 280, top: 36 };
const KEY_STEPS: Record<string, number> = {
  ArrowLeft: -MEAN_STEP,
  ArrowDown: -MEAN_STEP,
  ArrowRight: MEAN_STEP,
  ArrowUp: MEAN_STEP,
  PageDown: -4 * MEAN_STEP,
  PageUp: 4 * MEAN_STEP,
};

type CurvePlotProps = {
  readonly curve: HeroCurve;
  readonly mean: number;
  readonly onMean: (mean: number) => void;
};

/** Flat crowd bars under the draft curve. The whole plot is one slider for the mean. */
export function CurvePlot({ curve, mean, onMean }: CurvePlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const peak = Math.max(...curve.masses);
  const points = bucketPoints(curve.masses, FRAME, peak);
  const crowdY = bucketPoints(curve.crowd, FRAME, peak)[0]?.y ?? FRAME.height;
  const barWidth = FRAME.width / curve.masses.length;
  const meanX = ((mean - HERO_LOW) / (HERO_HIGH - HERO_LOW)) * FRAME.width;

  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = ref.current?.getBoundingClientRect();
    if (box === undefined || box.width === 0) return;
    const ratio = (event.clientX - box.left) / box.width;
    onMean(clampMean(HERO_LOW + ratio * (HERO_HIGH - HERO_LOW)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = KEY_STEPS[event.key];
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      onMean(event.key === "Home" ? HERO_LOW : HERO_HIGH);
    } else if (step !== undefined) {
      event.preventDefault();
      onMean(clampMean(mean + step));
    }
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={copy.landing.curve.slider}
      aria-valuemin={HERO_LOW}
      aria-valuemax={HERO_HIGH}
      aria-valuenow={mean}
      aria-valuetext={`${mean.toFixed(1)} ${copy.landing.curve.unit}`}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        fromPointer(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) fromPointer(event);
      }}
      className="cursor-ew-resize touch-none select-none px-2 pt-4 focus-visible:outline-offset-0"
    >
      <svg
        viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
        aria-hidden
        className="block h-auto w-full"
      >
        {curve.crowd.map((_, i) => (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length bucket grid
            key={i}
            data-curve="bar"
            x={i * barWidth + 1}
            y={crowdY}
            width={barWidth - 2}
            height={FRAME.height - crowdY}
            className="fill-curve-crowd"
          />
        ))}
        <path data-curve="area" d={smoothArea(points, FRAME)} className="fill-signal/10" />
        <path
          data-curve="line"
          d={smoothLine(points)}
          fill="none"
          strokeWidth={2}
          className="stroke-curve-user"
        />
        <line
          data-curve="marker"
          x1={meanX}
          x2={meanX}
          y1={FRAME.top - 20}
          y2={FRAME.height}
          strokeDasharray="3 5"
          className="stroke-text-faint"
        />
        <circle
          data-curve="handle"
          cx={meanX}
          cy={FRAME.top - 20}
          r={7}
          strokeWidth={2}
          className="fill-curve-user stroke-surface"
        />
      </svg>
      <div className="flex justify-between px-1 pt-2 pb-3 font-mono text-label text-text-faint">
        <span>{HERO_LOW}</span>
        <span>{(HERO_LOW + HERO_HIGH) / 2}</span>
        <span>{HERO_HIGH}</span>
      </div>
    </div>
  );
}
