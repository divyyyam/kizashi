"use client";
import { type PointerEvent, useState } from "react";
import { copy } from "@/content/copy";
import {
  clampMean,
  HERO_HIGH,
  HERO_LOW,
  heroCurve,
  MEAN_START,
  SIGMA_START,
} from "@/features/landing/lib/hero-grid";
import { ChapterHeading } from "./ChapterHeading";
import { useChapter } from "./use-chapter";

export function ModesChapter() {
  const { ref, progress, setProgress } = useChapter(0.68);
  const [mean, setMean] = useState(MEAN_START);
  const masses = heroCurve(mean, SIGMA_START).masses,
    peak = Math.max(...masses);
  const heights = masses.map(
    (mass, i) =>
      ((i >= masses.length / 2 ? 1 : 0.012) * (1 - progress) + (mass / peak) * progress) * 121,
  );
  const w = 14,
    base = 156;
  function drag(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    setMean(
      clampMean(HERO_LOW + ((event.clientX - box.left) / box.width) * (HERO_HIGH - HERO_LOW)),
    );
    setProgress(1);
  }
  return (
    <section id="modes" ref={ref} className="story-chapter">
      <ChapterHeading index={0} title={copy.story.modeTitle} body={copy.story.modeBody} />
      <div className="story-plate">
        <div className="plate-meta">
          <span>{copy.story.forecast}</span>
          <span>
            {mean} {copy.landing.curve.unit}
          </span>
        </div>
        <svg
          viewBox="0 0 480 178"
          className="mode-plot"
          role="img"
          aria-label={copy.story.forecast}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            drag(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) drag(event);
          }}
        >
          <path
            d="M12 36H467M12 96H467M12 156H467"
            className="stroke-border"
            strokeDasharray="2 5"
            fill="none"
          />
          {heights.map((height, i) => (
            <rect
              // biome-ignore lint/suspicious/noArrayIndexKey: one rect per fixed bucket; the bucket's low edge is its identity
              key={HERO_LOW + i}
              x={16 + i * w}
              y={base - height}
              width={w - 2}
              height={height}
              className="fill-curve-user"
              opacity={0.25 + (0.5 * height) / 121}
            />
          ))}
          <polyline
            points={heights.map((height, i) => `${23 + i * w},${base - height}`).join(" ")}
            className="fill-none stroke-text"
            strokeWidth="1.5"
            opacity={progress}
          />
        </svg>
        <div className="plate-controls">
          <label>
            {copy.story.modeMix}
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(progress * 100)}
              onChange={(e) => setProgress(Number(e.target.value) / 100)}
            />
          </label>
          <label>
            {copy.curve.mean}
            <input
              type="range"
              min={HERO_LOW}
              max={HERO_HIGH}
              step=".5"
              value={mean}
              onChange={(e) => {
                setMean(Number(e.target.value));
                setProgress(1);
              }}
            />
          </label>
        </div>
      </div>
    </section>
  );
}
