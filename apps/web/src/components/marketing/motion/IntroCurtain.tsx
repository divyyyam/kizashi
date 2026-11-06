import { BrandGlyph } from "@/components/layout/BrandGlyph";
import { copy } from "@/content/copy";

/**
 * Brand curtain for the first landing visit of a session. CSS shows it only when MotionFlag has
 * marked <html> with `curtain-play` (motion allowed, not yet seen), so it never flashes otherwise.
 * `curtain.ts` draws the mark and lifts it; nothing waits on data.
 */
export function IntroCurtain() {
  return (
    <div aria-hidden className="intro-curtain">
      <div className="curtain-seal">
        <BrandGlyph className="curtain-mark" />
      </div>
      <span className="curtain-word">{copy.site.name}</span>
    </div>
  );
}
