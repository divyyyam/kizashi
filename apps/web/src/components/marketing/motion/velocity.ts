import { gsap, ScrollTrigger } from "@/lib/motion/gsap";

// Scroll velocity (px/s) that produces the maximum skew, and that maximum in degrees.
const VELOCITY_FOR_MAX = 3000;
const SKEW_MAX_DEG = 8;

const skewFor = (velocity: number): number =>
  gsap.utils.clamp(-SKEW_MAX_DEG, SKEW_MAX_DEG, (velocity / VELOCITY_FOR_MAX) * SKEW_MAX_DEG);

/**
 * The name band: its rows travel in opposite directions as the page scrolls, and every big title
 * leans with the scroll speed, then settles.
 */
export function velocityScenes(root: HTMLElement): void {
  for (const band of gsap.utils.toArray<HTMLElement>(".velocity-band", root)) {
    band.querySelectorAll<HTMLElement>(".velocity-row").forEach((row, i) => {
      gsap.fromTo(
        row,
        { xPercent: i % 2 === 0 ? 0 : -25 },
        {
          xPercent: i % 2 === 0 ? -25 : 0,
          ease: "none",
          scrollTrigger: {
            trigger: band,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.4,
            refreshPriority: -1,
          },
        },
      );
    });
  }
  const leaners = gsap.utils.toArray<HTMLElement>(
    ".velocity-row, .statement-text, .chapter-copy h2",
    root,
  );
  if (leaners.length === 0) return;
  const skews = leaners.map((el) => gsap.quickTo(el, "skewY", { duration: 0.5, ease: "power3" }));
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      const skew = skewFor(self.getVelocity());
      for (const set of skews) set(skew);
    },
  });
}
