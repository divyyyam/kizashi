import { EASE_OUT, gsap, ScrollTrigger, SplitText } from "@/lib/motion/gsap";
import { scrambleIn } from "./hero-intro";

// Refresh after the chapters' pins, so start positions include the pin spacing above them.
const AFTER_PINS = -1;
const START = "top 75%";

const trigger = (el: Element, start = START) => ({
  trigger: el,
  start,
  once: true,
  refreshPriority: AFTER_PINS,
});

/** Any `[data-split]` title on a marketing page: words rise out of line masks. */
function titles(root: HTMLElement): void {
  for (const title of gsap.utils.toArray<HTMLElement>("[data-split]", root)) {
    SplitText.create(title, {
      type: "lines,words",
      mask: "lines",
      autoSplit: true,
      onSplit: (split) =>
        gsap.from(split.words, {
          yPercent: 115,
          rotate: 5,
          stagger: 0.035,
          duration: 1.2,
          ease: EASE_OUT,
          scrollTrigger: trigger(title),
        }),
    });
  }
}

/** Chapter cap: the numeral slams in, the rule extends, the chapter name scrambles. */
function caps(root: HTMLElement): void {
  for (const cap of gsap.utils.toArray<HTMLElement>(".chapter-cap", root)) {
    const tl = gsap.timeline({
      defaults: { ease: EASE_OUT },
      scrollTrigger: trigger(cap, "top 82%"),
    });
    const numeral = cap.querySelector(".font-jp");
    if (numeral !== null) {
      tl.from(numeral, {
        scale: 2.6,
        rotate: -25,
        autoAlpha: 0,
        duration: 1.1,
        ease: "back.out(2)",
      });
    }
    tl.from(
      cap.querySelector(".cap-line"),
      { scaleX: 0, transformOrigin: "0% 50%", duration: 0.9 },
      0.15,
    );
    const name = scrambleIn(cap.lastElementChild);
    if (name !== undefined) tl.add(name, 0.2);
  }
}

/** Plates wipe open from the bottom; their meta text scrambles and their bars rise. */
function plates(root: HTMLElement): void {
  for (const plate of gsap.utils.toArray<HTMLElement>(".story-plate", root)) {
    const tl = gsap.timeline({ defaults: { ease: EASE_OUT }, scrollTrigger: trigger(plate) });
    tl.fromTo(
      plate,
      { clipPath: "inset(100% 0% 0% 0%)", y: 60 },
      { clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 1.4, clearProps: "clipPath" },
    );
    for (const meta of plate.querySelectorAll(".plate-meta > span")) {
      const tween = scrambleIn(meta, 0.9);
      if (tween !== undefined) tl.add(tween, 0.35);
    }
    const bars = plate.querySelectorAll("svg rect");
    if (bars.length > 0) {
      tl.from(
        bars,
        {
          scaleY: 0,
          transformOrigin: "50% 100%",
          stagger: { each: 0.012, from: "random" },
          duration: 0.9,
          clearProps: "transform",
        },
        0.45,
      );
    }
    tl.from(
      plate.querySelectorAll(".plate-controls > *, .net-readouts > *"),
      { y: 18, autoAlpha: 0, stagger: 0.08, duration: 0.8 },
      0.7,
    );
  }
}

/** Body copy beside each title, and the empty listing state. Hidden up front, revealed in batches. */
function copyBlocks(root: HTMLElement): void {
  const blocks = gsap.utils.toArray<HTMLElement>(
    ".chapter-copy p, .chapter-copy + a, .listing-state > *",
    root,
  );
  gsap.set(blocks, { y: 26, autoAlpha: 0 });
  ScrollTrigger.batch(blocks, {
    start: START,
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { y: 0, autoAlpha: 1, stagger: 0.08, duration: 1, ease: EASE_OUT }),
  });
}

export function chapterReveals(root: HTMLElement): void {
  titles(root);
  caps(root);
  plates(root);
  copyBlocks(root);
}
