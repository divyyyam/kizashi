"use client";

import { useRef } from "react";
import { copy } from "@/content/copy";
import { FINE_POINTER, gsap, useGSAP } from "@/lib/motion/gsap";

// Elements that grow the ring, and the draggable plots that label it.
const INTERACTIVE = "a, button, [data-magnetic], label";
const DRAGGABLE = ".mode-plot, .curve-surface, input[type='range'], [role='slider']";

type RingState = "idle" | "link" | "drag";

function stateFor(target: EventTarget | null): RingState {
  if (!(target instanceof Element)) return "idle";
  if (target.closest(DRAGGABLE) !== null) return "drag";
  return target.closest(INTERACTIVE) !== null ? "link" : "idle";
}

/** A dot that tracks the pointer exactly and a ring that trails it. Fine pointers only. */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(FINE_POINTER, () => {
      if (dot.current === null || ring.current === null) return;
      const ringEl = ring.current;
      const dotX = gsap.quickTo(dot.current, "x", { duration: 0.08, ease: "power3" });
      const dotY = gsap.quickTo(dot.current, "y", { duration: 0.08, ease: "power3" });
      const ringX = gsap.quickTo(ringEl, "x", { duration: 0.45, ease: "power3" });
      const ringY = gsap.quickTo(ringEl, "y", { duration: 0.45, ease: "power3" });
      let state: RingState = "idle";
      const move = (event: PointerEvent) => {
        document.documentElement.classList.add("cursor-on");
        dotX(event.clientX);
        dotY(event.clientY);
        ringX(event.clientX);
        ringY(event.clientY);
        const next = stateFor(event.target);
        if (next === state) return;
        state = next;
        ringEl.dataset.state = next;
        if (label.current !== null)
          label.current.textContent = next === "drag" ? copy.motion.drag : "";
        gsap.to(ringEl, {
          scale: next === "idle" ? 1 : next === "drag" ? 1.7 : 1.45,
          duration: 0.4,
          ease: "expo.out",
        });
      };
      const leave = () => document.documentElement.classList.remove("cursor-on");
      window.addEventListener("pointermove", move);
      document.documentElement.addEventListener("pointerleave", leave);
      return () => {
        window.removeEventListener("pointermove", move);
        document.documentElement.removeEventListener("pointerleave", leave);
        leave();
      };
    });
    return () => mm.revert();
  });
  return (
    <>
      <div ref={ring} aria-hidden className="cursor-ring" data-state="idle">
        <span ref={label} />
      </div>
      <div ref={dot} aria-hidden className="cursor-dot" />
    </>
  );
}
