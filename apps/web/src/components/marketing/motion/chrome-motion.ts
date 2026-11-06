import { EASE_OUT, gsap, ScrollTrigger, SplitText } from "@/lib/motion/gsap";

// Scroll distance before the header may hide, so it stays put over the top of the hero.
const HIDE_AFTER_PX = 160;

/** Header hides on the way down, returns on the way up; its rule fills with page progress. */
export function headerMotion(root: HTMLElement): void {
  const header = root.querySelector<HTMLElement>(".site-header");
  if (header === null) return;
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      const hide = self.direction === 1 && self.scroll() > HIDE_AFTER_PX;
      header.dataset.hidden = String(hide);
    },
    onLeaveBack: () => {
      header.dataset.hidden = "false";
    },
  });
  gsap.to(header.querySelector(".site-progress"), {
    scaleX: 1,
    ease: "none",
    scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
  });
}

/** The giant footer wordmark: letters rise on arrival and ripple when hovered. */
export function footerMotion(root: HTMLElement): () => void {
  const word = root.querySelector<HTMLElement>(".footer-word");
  if (word === null) return () => undefined;
  // No masks: they would clip the hover ripple.
  const split = SplitText.create(word, { type: "chars", charsClass: "char" });
  gsap.from(split.chars, {
    yPercent: 70,
    rotate: 10,
    autoAlpha: 0,
    stagger: 0.05,
    duration: 1.3,
    ease: EASE_OUT,
    scrollTrigger: { trigger: word, start: "top 92%", once: true, refreshPriority: -1 },
  });
  gsap.from(root.querySelectorAll(".footer-data dl > div"), {
    y: 24,
    autoAlpha: 0,
    stagger: 0.1,
    duration: 1,
    ease: EASE_OUT,
    scrollTrigger: { trigger: word, start: "top bottom", once: true, refreshPriority: -1 },
  });
  const ripple = () =>
    gsap.to(split.chars, {
      keyframes: [
        { yPercent: -14, duration: 0.22 },
        { yPercent: 0, duration: 0.5, ease: "elastic.out(1, 0.45)" },
      ],
      stagger: 0.04,
      overwrite: true,
    });
  word.addEventListener("pointerenter", ripple);
  return () => word.removeEventListener("pointerenter", ripple);
}
