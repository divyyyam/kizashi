"use client";
import { useEffect, useRef, useState } from "react";

/** Scroll sets the timeline on a roomy screen. Native sliders provide the same frames everywhere. */
export function useChapter(travel: number, initial = 1) {
  const ref = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    const media = matchMedia(
      "(min-width: 900px) and (min-height: 610px) and (prefers-reduced-motion: no-preference)",
    );
    let revision = 0,
      dispose: (() => void) | undefined;
    function sync() {
      const current = ++revision;
      dispose?.();
      dispose = undefined;
      if (!el || !media.matches) {
        setProgress(initial);
        return;
      }
      void import("@/lib/motion/gsap").then(({ ScrollTrigger }) => {
        if (current !== revision || !el) return;
        const scene = ScrollTrigger.create({
          trigger: el,
          start: "top 64px",
          end: () => `+=${Math.round(innerHeight * travel)}`,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => setProgress(Math.round(self.progress * 160) / 160),
        });
        setProgress(scene.progress);
        dispose = () => scene.kill();
        ScrollTrigger.refresh();
      });
    }
    sync();
    media.addEventListener("change", sync);
    return () => {
      revision++;
      media.removeEventListener("change", sync);
      dispose?.();
    };
  }, [travel, initial]);
  return { ref, progress, setProgress };
}
