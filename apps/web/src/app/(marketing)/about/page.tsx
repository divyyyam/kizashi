import { copy } from "@/content/copy";
import { Lifecycle, Stack } from "@/features/landing";

export default function AboutPage() {
  return (
    <>
      <header className="feature-article">
        <h1>
          {copy.motion.about} <em>{copy.site.name}</em>
        </h1>
        <p>{copy.story.intro}</p>
      </header>
      <Lifecycle />
      <Stack />
    </>
  );
}
