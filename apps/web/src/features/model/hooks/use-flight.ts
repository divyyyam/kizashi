"use client";

import { type RefObject, useLayoutEffect } from "react";

export type FlightOrigin = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

const FLIGHT_MS = 900;
const FLIGHT_EASING = "cubic-bezier(0.65, 0, 0.35, 1)";
// The card's content fades in over the last part of the flight, once its frame is nearly settled.
const CONTENT_FADE_START = 0.55;

/**
 * FLIP flight: the element is laid out in its final place, then played back from `origin`
 * (the prompt box's rect) with translate + scale from the top-left corner. Transform only.
 */
export function useFlight(
  frame: RefObject<HTMLElement | null>,
  content: RefObject<HTMLElement | null>,
  origin: FlightOrigin | null,
) {
  useLayoutEffect(() => {
    const el = frame.current;
    if (el === null || origin === null) return;
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    const last = el.getBoundingClientRect();
    if (last.width === 0 || last.height === 0) return;
    const dx = origin.left - last.left;
    const dy = origin.top - last.top;
    const sx = origin.width / last.width;
    const sy = origin.height / last.height;
    const flight = el.animate(
      [{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transform: "none" }],
      { duration: FLIGHT_MS, easing: FLIGHT_EASING },
    );
    const fade = content.current?.animate(
      [{ opacity: 0 }, { opacity: 0, offset: CONTENT_FADE_START }, { opacity: 1 }],
      { duration: FLIGHT_MS, easing: "ease-out" },
    );
    return () => {
      flight.cancel();
      fade?.cancel();
    };
  }, [frame, content, origin]);
}
