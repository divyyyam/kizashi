import { copy } from "@/content/copy";
import { HeroCurve } from "./HeroCurve";
import { NettingExample } from "./NettingExample";
import { Section } from "./Section";

export function ResearchExamples() {
  return (
    <>
      <Section labelledBy="research-backing">
        <h2 id="research-backing" data-split className="text-display">
          {copy.portfolio.collateral}
        </h2>
        <NettingExample />
      </Section>
      <Section labelledBy="research-curve">
        <h2 id="research-curve" data-split className="text-display">
          {copy.story.forecast}
        </h2>
        <HeroCurve />
      </Section>
    </>
  );
}
