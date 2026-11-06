"use client";
import { useEffect, useRef, useState } from "react";

const MORPH_MS = 250;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const onChange = () => setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function useCrowdMorph(target: readonly number[]): readonly number[] {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    if (
      current.current.length === target.length &&
      current.current.every((value, index) => value === target[index])
    )
      return;
    if (reduced || current.current.length !== target.length) {
      current.current = target;
      setShown(target);
      return;
    }
    const from = current.current;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / MORPH_MS);
      current.current = target.map(
        (value, i) => (from[i] ?? value) + (value - (from[i] ?? value)) * t,
      );
      setShown(current.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced]);
  return shown;
}
