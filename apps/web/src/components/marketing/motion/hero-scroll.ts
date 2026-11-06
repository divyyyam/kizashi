import { gsap } from "@/lib/motion/gsap";

// Horizontal drift per headline line as the hero scrolls away, in % of the line's width.
const LINE_DRIFT = [-9, 7, -5] as const;

/** Leaving the hero: headline lines slide apart, the plate sinks slower than the page, copy fades. */
export function heroScroll(root: HTMLElement): void {
  const hero = root.querySelector<HTMLElement>(".signal-hero");
  if (hero === null) return;
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.8 },
  });
  gsap.utils.toArray<HTMLElement>(".ink-headline > span", hero).forEach((line, i) => {
    tl.to(line, { xPercent: LINE_DRIFT[i] ?? 0 }, 0);
  });
  tl.to(hero.querySelector(".hero-type"), { y: -90, autoAlpha: 0.15 }, 0)
    // The plate and its WebGL canvas move as one, so the ink stays registered to its contours.
    .to(hero.querySelectorAll(".ink-plate, .ink-canvas"), { y: 70 }, 0);
}
