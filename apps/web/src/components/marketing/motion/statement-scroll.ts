import { EASE_OUT, gsap, SplitText } from "@/lib/motion/gsap";

/** The thesis line inks in word by word with scroll; the rule draws and the mark turns behind it. */
export function statementScroll(root: HTMLElement): void {
  for (const band of gsap.utils.toArray<HTMLElement>(".statement", root)) {
    const text = band.querySelector(".statement-text");
    if (text === null) continue;
    SplitText.create(text, {
      type: "words",
      autoSplit: true,
      onSplit: (split) =>
        gsap.fromTo(
          split.words,
          { opacity: 0.1, y: 18 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.12,
            ease: "none",
            scrollTrigger: {
              trigger: text,
              start: "top 78%",
              end: "bottom 42%",
              scrub: 0.6,
              refreshPriority: -1,
            },
          },
        ),
    });
    gsap.from(band.querySelector(".statement-rule"), {
      scaleX: 0,
      ease: EASE_OUT,
      duration: 1.6,
      scrollTrigger: { trigger: text, start: "bottom 60%", once: true, refreshPriority: -1 },
    });
    gsap.fromTo(
      band.querySelector(".statement-mark"),
      { rotate: -18, scale: 0.8, yPercent: 10 },
      {
        rotate: 12,
        scale: 1.1,
        yPercent: -10,
        ease: "none",
        scrollTrigger: {
          trigger: band,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          refreshPriority: -1,
        },
      },
    );
  }
}
