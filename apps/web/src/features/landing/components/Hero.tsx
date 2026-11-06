import { ArrowDown, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { BrandGlyph } from "@/components/layout/BrandGlyph";
import { InkField } from "@/components/marketing/hero/InkField";
import { copy } from "@/content/copy";

export function Hero() {
  const text = copy.landing.hero;
  return (
    <section className="signal-hero" aria-labelledby="hero-title">
      <InkField />
      <div className="hero-type">
        <p className="hero-kicker text-label" data-intro>
          <span aria-hidden />
          <span className="kicker-text">{text.eyebrow}</span>
        </p>
        <h1 id="hero-title" className="ink-headline" data-intro>
          <span>
            <span>{text.headlineLead}</span>
          </span>
          <span>
            <span>
              <em>{text.headlineAccent}</em> {copy.story.of}
            </span>
          </span>
          <span>
            <span>{copy.story.happens}</span>
          </span>
        </h1>
        <p className="hero-deck" data-intro>
          {copy.story.intro}
        </p>
        <div className="hero-actions" data-intro>
          <Link href="/markets" className="ink-button" data-magnetic>
            {copy.story.openMarkets}
            <ArrowUpRight aria-hidden size={17} />
          </Link>
          <a href="#netting" className="ink-link">
            {text.secondary}
            <ArrowDown aria-hidden size={15} />
          </a>
        </div>
      </div>
      <div className="hero-foot" data-intro>
        <a href="#modes">
          <ArrowDown aria-hidden size={13} />
          {copy.story.scroll}
        </a>
        <BrandGlyph className="brush-mark" />
      </div>
    </section>
  );
}
