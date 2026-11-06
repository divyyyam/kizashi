import { copy } from "@/content/copy";

export function ChapterHeading({
  index,
  title,
  body,
}: {
  index: 0 | 1 | 2 | 3;
  title: string;
  body: string;
}) {
  return (
    <header className="chapter-copy">
      <div className="chapter-cap">
        <span aria-hidden className="font-jp">
          {copy.motion.chapters[index]}
        </span>
        <span className="cap-line" />
        <span>{copy.story.names[index]}</span>
      </div>
      <h2 data-split className="text-display">
        {title}
      </h2>
      <p>{body}</p>
    </header>
  );
}
