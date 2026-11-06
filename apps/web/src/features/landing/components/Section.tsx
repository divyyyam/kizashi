import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionProps = {
  readonly id?: string;
  readonly labelledBy?: string;
  readonly children: ReactNode;
  readonly className?: string;
};

/** One landing band on the wide column, separated by a hairline. */
export function Section({ id, labelledBy, children, className }: SectionProps) {
  return (
    <section id={id} aria-labelledby={labelledBy} className="scroll-mt-16 border-t border-border">
      <div
        className={cn(
          "mx-auto flex w-full max-w-wide flex-col gap-14 px-4 py-24 md:px-6 lg:px-8 lg:py-32",
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}
