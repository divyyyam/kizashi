import { EASE_OUT, gsap, SCRAMBLE_CHARS, SplitText } from "@/lib/motion/gsap";

/** Text swap through random glyphs, ending on the element's own text. */
export function scrambleIn(el: Element | null, duration = 1.1): gsap.core.Tween | undefined {
  if (el === null) return undefined;
  const text = el.textContent ?? "";
  return gsap.fromTo(
    el,
    { scrambleText: { text: " ", chars: SCRAMBLE_CHARS } },
    {
      scrambleText: { text, chars: SCRAMBLE_CHARS, speed: 0.6, revealDelay: 0.2 },
      duration,
      ease: "none",
    },
  );
}

/** Headline letters swing up out of each line's mask; the italic accent word lands last, larger. */
function headline(root: HTMLElement, tl: gsap.core.Timeline): void {
  const title = root.querySelector<HTMLElement>(".ink-headline");
  if (title === null) return;
  gsap.set(title, { autoAlpha: 1, perspective: 900 });
  const lines = gsap.utils.toArray<HTMLElement>(".ink-headline > span > span", root);
  lines.forEach((line, index) => {
    const split = SplitText.create(line, { type: "chars", charsClass: "char" });
    const plain = split.chars.filter((char) => char.closest("em") === null);
    const accent = split.chars.filter((char) => char.closest("em") !== null);
    tl.from(
      plain,
      { yPercent: 118, rotateX: -78, transformOrigin: "50% 100%", stagger: 0.022, duration: 1.15 },
      0.25 + index * 0.12,
    );
    if (accent.length > 0) {
      tl.from(
        accent,
        {
          yPercent: 70,
          scale: 0.4,
          rotate: -14,
          autoAlpha: 0,
          stagger: 0.035,
          duration: 1.3,
          ease: "back.out(1.8)",
        },
        0.62,
      );
    }
  });
}

/** The paper contours stay visible from first paint; only the two accent strokes draw in. */
function plate(root: HTMLElement, tl: gsap.core.Timeline): void {
  const accents = root.querySelectorAll(".plate-filaments .stroke-curve-user");
  if (accents.length) tl.from(accents, { drawSVG: 0, duration: 0.85, stagger: 0.1 }, 0.1);
}

/**
 * The opening sequence, about 2.2 s; everything after 1 s is decoration on a readable page.
 * `delaySec` lets it start under the lifting intro curtain.
 */
export function heroIntro(root: HTMLElement, delaySec = 0): void {
  const hero = root.querySelector<HTMLElement>(".signal-hero");
  if (hero === null) return;
  const q = gsap.utils.selector(hero);
  const tl = gsap.timeline({ defaults: { ease: EASE_OUT }, delay: delaySec });
  tl.set(q("[data-intro]"), { autoAlpha: 1 }).from(
    q(".hero-kicker > span:first-child"),
    { scaleX: 0, transformOrigin: "0% 50%", duration: 0.9 },
    0.1,
  );
  const kicker = scrambleIn(hero.querySelector(".kicker-text"));
  if (kicker !== undefined) tl.add(kicker, 0.15);
  headline(hero, tl);
  plate(hero, tl);
  const deck = hero.querySelector(".hero-deck");
  if (deck !== null) {
    const split = SplitText.create(deck, { type: "lines", mask: "lines" });
    tl.from(split.lines, { yPercent: 100, stagger: 0.07, duration: 1 }, 0.85);
  }
  tl.from(
    q(".hero-actions > *"),
    { y: 12, autoAlpha: 0, stagger: 0.05, duration: 0.55 },
    0.48,
  ).from(q(".hero-foot"), { y: 7, autoAlpha: 0, duration: 0.5 }, 0.75);
  const caption = scrambleIn(hero.querySelector(".field-name"), 1.2);
  if (caption !== undefined) tl.add(caption, 1.4);
}
