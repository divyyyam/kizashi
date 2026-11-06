import { copy } from "@/content/copy";

// Each row repeats the chapter names so it can travel a quarter of its width without a gap.
const REPEAT = 4;

/** Two giant rows of the chapter names that slide with scroll. Decorative; the chapters say it. */
export function VelocityBand() {
  const run = Array.from({ length: REPEAT }, (_, pass) => pass);
  return (
    <div aria-hidden className="velocity-band">
      {["forward", "reverse"].map((direction) => (
        <p key={direction} className="velocity-row">
          {run.map((pass) =>
            copy.story.names.map((name) => (
              <span key={`${pass}-${name}`}>
                {name}
                <i lang="ja">{copy.motion.mark}</i>
              </span>
            )),
          )}
        </p>
      ))}
    </div>
  );
}
