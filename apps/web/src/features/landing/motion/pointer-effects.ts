import { gsap } from "@/lib/motion/gsap";

export function pointerEffects(root: HTMLElement) {
  const cleanups: (() => void)[] = [];
  for (const el of root.querySelectorAll<HTMLElement>("[data-magnetic]")) {
    const x = gsap.quickTo(el, "x", { duration: 0.24, ease: "expo.out" }),
      y = gsap.quickTo(el, "y", { duration: 0.24, ease: "expo.out" });
    function move(event: PointerEvent) {
      const box = el.getBoundingClientRect();
      x((event.clientX - box.left - box.width / 2) * 0.11);
      y((event.clientY - box.top - box.height / 2) * 0.14);
    }
    function leave() {
      x(0);
      y(0);
    }
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    cleanups.push(() => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    });
  }
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
