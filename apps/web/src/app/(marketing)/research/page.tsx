import { copy } from "@/content/copy";
import { ResearchExamples } from "@/features/landing";

export default function ResearchPage() {
  return (
    <>
      <header className="feature-article">
        <h1>{copy.motion.research}</h1>
        <p>{copy.story.researchBody}</p>
      </header>
      <ResearchExamples />
    </>
  );
}
