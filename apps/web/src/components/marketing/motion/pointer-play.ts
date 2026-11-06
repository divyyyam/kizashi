import { gsap } from "@/lib/motion/gsap";

// Headline letters within this many px of the pointer lift toward it.
const REACH_PX = 220;
const LIFT_PX = -26;
// Story plates tilt at most this many degrees toward the pointer.
const TILT_DEG = 5;

/** Letters near the pointer rise and take the signal colour; farther ones settle back. */
function headlineReach(root: HTMLElement): () => void {
  const hero = root.querySelector<HTMLElement>(".signal-hero");
  const chars = gsap.utils.toArray<HTMLElement>(".ink-headline .char", root);
  if (hero === null || chars.length === 0) return () => undefined;
  const lifts = chars.map((char) => gsap.quickTo(char, "y", { duration: 0.6, ease: "power3" }));
  const move = (event: PointerEvent) => {
    chars.forEach((char, i) => {
      const box = char.getBoundingClientRect();
      const distance = Math.hypot(
        event.clientX - (box.left + box.width / 2),
        event.clientY - (box.top + box.height / 2),
      );
      const pull = Math.max(0, 1 - distance / REACH_PX);
      lifts[i]?.(LIFT_PX * pull * pull);
      char.classList.toggle("is-near", pull > 0.35);
    });
  };
  const leave = () => {
    for (const lift of lifts) lift(0);
    for (const char of chars) char.classList.remove("is-near");
  };
  hero.addEventListener("pointermove", move);
  hero.addEventListener("pointerleave", leave);
  return () => {
    hero.removeEventListener("pointermove", move);
    hero.removeEventListener("pointerleave", leave);
  };
}

/** Story plates turn a few degrees toward the pointer, in perspective. */
function plateTilt(root: HTMLElement): () => void {
  const cleanups = gsap.utils.toArray<HTMLElement>(".story-plate", root).map((plate) => {
    gsap.set(plate, { transformPerspective: 1200 });
    const rx = gsap.quickTo(plate, "rotationX", { duration: 0.7, ease: "power3" });
    const ry = gsap.quickTo(plate, "rotationY", { duration: 0.7, ease: "power3" });
    const move = (event: PointerEvent) => {
      const box = plate.getBoundingClientRect();
      ry(((event.clientX - box.left) / box.width - 0.5) * 2 * TILT_DEG);
      rx(-((event.clientY - box.top) / box.height - 0.5) * 2 * TILT_DEG);
    };
    const leave = () => {
      rx(0);
      ry(0);
    };
    plate.addEventListener("pointermove", move);
    plate.addEventListener("pointerleave", leave);
    return () => {
      plate.removeEventListener("pointermove", move);
      plate.removeEventListener("pointerleave", leave);
    };
  });
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

export function pointerPlay(root: HTMLElement): () => void {
  const stopReach = headlineReach(root);
  const stopTilt = plateTilt(root);
  return () => {
    stopReach();
    stopTilt();
  };
}
