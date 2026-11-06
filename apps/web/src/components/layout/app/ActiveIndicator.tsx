"use client";

import { type RefObject, useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/motion/gsap";

type ActiveIndicatorProps = {
  /** The nav element whose `[aria-current='page']` link the pill sits behind. */
  readonly navRef: RefObject<HTMLElement | null>;
  /** Changes whenever the active link or the layout does (path, collapsed state). */
  readonly trackKey: string;
};

/** The raised pill behind the active link. It glides between links instead of jumping. */
export function ActiveIndicator({ navRef, trackKey }: ActiveIndicatorProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  useGSAP(
    () => {
      const pill = ref.current;
      const link = navRef.current?.querySelector<HTMLElement>("[aria-current='page']");
      if (pill === null) return;
      if (link === null || link === undefined) {
        gsap.to(pill, { autoAlpha: 0, duration: 0.2 });
        return;
      }
      // Width only changes with the collapsed state, so it is set, never tweened.
      gsap.set(pill, { width: link.offsetWidth, autoAlpha: 1 });
      const target = { x: link.offsetLeft, y: link.offsetTop };
      const animate = placed.current && window.matchMedia(MOTION_OK).matches;
      if (animate) gsap.to(pill, { ...target, duration: 0.55, ease: "expo.out" });
      else gsap.set(pill, target);
      placed.current = true;
    },
    { dependencies: [trackKey] },
  );
  return (
    <span
      ref={ref}
      aria-hidden
      className="pointer-events-none invisible absolute top-0 left-0 h-10 rounded-md border border-border bg-surface"
    />
  );
}
