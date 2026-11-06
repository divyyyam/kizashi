"use client";

import { useEffect, useState } from "react";
import { copy } from "@/content/copy";

const CHAPTERS: readonly string[] = ["modes", "netting", "engine", "listings"];

export function ChapterIndex() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(CHAPTERS.indexOf(entry.target.id));
        }
      },
      { rootMargin: "-28% 0px -52% 0px" },
    );
    for (const id of CHAPTERS) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);
  return (
    <nav className="chapter-index" aria-label={copy.story.navigation}>
      <div className="chapter-index-track">
        <span
          aria-hidden
          className="chapter-index-ink"
          style={{ transform: `translateX(${active * 100}%)` }}
        />
        {CHAPTERS.map((id, index) => (
          <a key={id} href={`#${id}`} aria-current={index === active ? "location" : undefined}>
            {copy.story.names[index]}
          </a>
        ))}
      </div>
    </nav>
  );
}
