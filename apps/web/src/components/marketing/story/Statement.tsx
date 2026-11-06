import { copy } from "@/content/copy";

const text = copy.landing.netting;

/** The thesis in one line, between the hero and the chapters. It inks in as it scrolls past. */
export function Statement() {
  return (
    <section className="statement" aria-labelledby="statement-title">
      <span aria-hidden lang="ja" className="statement-mark">
        {copy.motion.mark}
      </span>
      <p className="chapter-cap">
        <span className="cap-line" />
        <span>{text.eyebrow}</span>
      </p>
      <h2 id="statement-title" className="statement-text">
        {text.titleLead} <em>{text.titleAccent}</em>
      </h2>
      <span aria-hidden className="statement-rule" />
    </section>
  );
}
