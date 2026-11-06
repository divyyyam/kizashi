"use client";

import { animate } from "motion";
import { useEffect, useRef } from "react";

/** Only the ink around the handle springs. The actual coordinate always equals the quoted draft. */
export function useHandleSpring() {
  const ink = useRef<SVGGElement>(null);
  const stop = useRef<() => void>(() => {});
  useEffect(() => () => stop.current(), []);
  function settle() {
    const node = ink.current;
    if (!node || !matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    stop.current();
    const tokens = getComputedStyle(document.documentElement);
    const playback = animate(
      node,
      { scale: [1.45, 1] },
      {
        type: "spring",
        stiffness: Number(tokens.getPropertyValue("--spring-stiffness")),
        damping: Number(tokens.getPropertyValue("--spring-damping")),
        mass: Number(tokens.getPropertyValue("--spring-mass")),
      },
    );
    stop.current = () => playback.stop();
  }
  return { ink, settle };
}
