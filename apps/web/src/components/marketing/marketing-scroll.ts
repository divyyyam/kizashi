import Lenis from "lenis";
import { pointerEffects } from "@/features/landing/motion/pointer-effects";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";

export function mountScroll() {
  const root = document.querySelector<HTMLElement>(".marketing-shell");
  if (!root) return;
  const lenis = new Lenis({
    lerp: 0.13,
    smoothWheel: true,
    syncTouch: false,
    // Native fragment navigation measures the final pinned layout and owns browser history.
    stopInertiaOnNavigate: true,
  });
  const tick = (seconds: number) => lenis.raf(seconds * 1000);
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(tick);
  const ctx = gsap.context(() => {
    // Title reveals live in motion/chapter-reveals.ts for every pointer type; this keeps smooth
    // scrolling and the magnetic pull, which only make sense with a mouse.
    return pointerEffects(root);
  }, root);
  return () => {
    ctx.revert();
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
}
