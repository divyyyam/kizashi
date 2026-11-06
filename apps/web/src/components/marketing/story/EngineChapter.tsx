"use client";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { copy } from "@/content/copy";
import { formatUsdc } from "@/lib/format";
import { ChapterHeading } from "./ChapterHeading";
import { useChapter } from "./use-chapter";

const EXAMPLE_BUDGET_USDC = 20_000_000n;
const EXAMPLE_PLAN = {
  mean: "145",
  spendUsdc: 4_000_000n,
} as const;

export function EngineChapter() {
  const { ref, progress, setProgress } = useChapter(0.75);
  const prompt = copy.story.enginePrompt;
  const reveal = Math.max(0, Math.min(1, (progress - 0.52) / 0.35));
  return (
    <section id="engine" ref={ref} className="story-chapter">
      <div>
        <ChapterHeading index={2} title={copy.story.engineTitle} body={copy.story.engineBody} />
        <Link href="/model" className="ink-link mt-5">
          {copy.story.engineLink}
          <ArrowUpRight aria-hidden size={16} />
        </Link>
      </div>
      <div className="story-plate">
        <div className="plate-meta">
          <span>{copy.story.script}</span>
          <span>{copy.motion.example}</span>
        </div>
        <p className="prompt-frame">
          <span className="sr-only">{prompt}</span>
          <span aria-hidden>
            {prompt.slice(0, Math.round(Math.min(1, progress / 0.52) * prompt.length))}
            <i />
          </span>
        </p>
        <div
          className="proposal-frame"
          style={{ opacity: 0.25 + reveal * 0.75, transform: `translateY(${(1 - reveal) * 8}px)` }}
        >
          <div className="plate-meta">
            <span>{copy.story.engineProposal}</span>
            <span>{copy.market.expressive}</span>
          </div>
          <strong className="font-display text-3xl">
            {EXAMPLE_PLAN.mean} {copy.landing.curve.unit}
          </strong>
          <div className="budget-track">
            <span
              style={{
                transform: `scaleX(${(reveal * Number((EXAMPLE_PLAN.spendUsdc * 100n) / EXAMPLE_BUDGET_USDC)) / 100})`,
              }}
            />
          </div>
          <p className="flex flex-wrap justify-between gap-2 text-small text-text-muted">
            <span>
              {copy.story.proposed} · {formatUsdc(EXAMPLE_PLAN.spendUsdc)}
            </span>
            <span>
              {copy.story.budget} · {formatUsdc(EXAMPLE_BUDGET_USDC)}
            </span>
          </p>
        </div>
        <div className="plate-controls">
          <label>
            {copy.story.promptProgress}
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(progress * 100)}
              onChange={(e) => setProgress(Number(e.target.value) / 100)}
            />
          </label>
        </div>
      </div>
    </section>
  );
}
