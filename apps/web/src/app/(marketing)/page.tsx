import { IntroCurtain } from "@/components/marketing/motion/IntroCurtain";
import { ChapterIndex } from "@/components/marketing/story/ChapterIndex";
import { EngineChapter } from "@/components/marketing/story/EngineChapter";
import { LiveTicker } from "@/components/marketing/story/LiveTicker";
import { ModesChapter } from "@/components/marketing/story/ModesChapter";
import { NettingChapter } from "@/components/marketing/story/NettingChapter";
import { Statement } from "@/components/marketing/story/Statement";
import { VelocityBand } from "@/components/marketing/story/VelocityBand";
import { Hero } from "@/features/landing";
import { readMarketListings } from "@/lib/venue-data";

export default function LandingPage() {
  return (
    <>
      <IntroCurtain />
      <Hero />
      <Statement />
      <div>
        <ChapterIndex />
        <ModesChapter />
        <NettingChapter />
        <EngineChapter />
        <LiveTicker result={readMarketListings()} />
      </div>
      <VelocityBand />
    </>
  );
}
