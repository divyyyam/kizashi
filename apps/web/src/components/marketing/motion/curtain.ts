import { gsap } from "@/lib/motion/gsap";

const SEEN_KEY = "kizashi-curtain";
/** Seconds into the curtain when the hero intro should begin, overlapping the lift. */
export const CURTAIN_HANDOFF_SEC = 0.84;

/** True when the curtain is showing and should play (set by MotionFlag before paint). */
export function curtainPending(root: HTMLElement): boolean {
  return (
    document.documentElement.classList.contains("curtain-play") &&
    root.querySelector(".intro-curtain") !== null
  );
}

function markSeen(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Without storage the curtain may replay on the next landing visit; nothing else depends on it.
  }
}

/** Reveal the typeset outlines in place. A single wipe carries the finished seal into the hero. */
export function playCurtain(root: HTMLElement): void {
  const curtain = root.querySelector<HTMLElement>(".intro-curtain");
  if (curtain === null) return;
  markSeen();
  gsap
    .timeline({
      defaults: { ease: "expo.out" },
      onComplete: () => document.documentElement.classList.remove("curtain-play"),
      onInterrupt: () => document.documentElement.classList.remove("curtain-play"),
    })
    .fromTo(
      curtain.querySelectorAll(".curtain-mark path"),
      { clipPath: "inset(0% 0% 100% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", stagger: 0.055, duration: 0.42 },
      0.06,
    )
    .from(curtain.querySelector(".curtain-word"), { y: 7, opacity: 0, duration: 0.36 }, 0.28)
    .to(
      curtain,
      { clipPath: "inset(0% 0% 100% 0%)", duration: 0.52, ease: "power3.inOut" },
      CURTAIN_HANDOFF_SEC,
    );
}
