"use client";

import { useEffect, useRef } from "react";

function Digit({ value }: { value: string }) {
  const face = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  useEffect(() => {
    const el = face.current;
    const old = previous.current;
    previous.current = value;
    if (
      !el ||
      old === value ||
      !window.matchMedia("(prefers-reduced-motion: no-preference)").matches
    )
      return;
    const lane = el.parentElement;
    if (!lane) return;
    lane.dataset.previous = old;
    lane.classList.remove("digit-changing");
    void lane.offsetWidth;
    lane.classList.add("digit-changing");
  }, [value]);
  return (
    <span className="digit-lane">
      <span ref={face}>{value}</span>
    </span>
  );
}

/** The accessible value changes atomically. Faces animate only between the two actual glyphs. */
export function RollingDigits({ value }: { value: string }) {
  const glyphs = Array.from(value);
  return (
    <span className="tabular">
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">
        {glyphs.map((glyph, i) =>
          /\d/.test(glyph) ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable digit animation key
            <Digit key={glyphs.length - i} value={glyph} />
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable digit animation key
            <span key={glyphs.length - i}>{glyph}</span>
          ),
        )}
      </span>
    </span>
  );
}
