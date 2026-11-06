import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionHeadingProps = {
  readonly id?: string;
  readonly eyebrow: string;
  readonly lead: string;
  readonly accent: string;
  readonly children?: ReactNode;
  readonly className?: string;
};

/** Mono eyebrow over a serif title whose closing words turn italic. */
export function SectionHeading({
  id,
  eyebrow,
  lead,
  accent,
  children,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("flex max-w-3xl flex-col gap-5", className)}>
      <p data-reveal className="flex items-center gap-3 text-label text-text-muted">
        <span aria-hidden className="h-px w-6 bg-signal" />
        {eyebrow}
      </p>
      <h2 id={id} data-split className="text-display text-text">
        {lead} <em className="text-text-muted">{accent}</em>
      </h2>
      {children === undefined ? null : (
        <div data-reveal className="max-w-2xl text-body text-text-muted">
          {children}
        </div>
      )}
    </div>
  );
}
