import Link from "next/link";
import { BrandGlyph } from "@/components/layout/BrandGlyph";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";

type LogoProps = {
  readonly className?: string;
  /** Hide the wordmark and keep only the mark (collapsed sidebar). */
  readonly markOnly?: boolean;
};

/** The mark: a bell curve with the signal dot at its peak, beside the serif wordmark. */
export function Logo({ className, markOnly = false }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label={copy.nav.home}
      className={cn("flex min-h-10 items-center gap-2.5 rounded-sm text-text", className)}
    >
      <LogoMark />
      {markOnly ? null : (
        <span className="font-display text-2xl leading-none tracking-tight">{copy.site.name}</span>
      )}
    </Link>
  );
}

function LogoMark() {
  return (
    <span aria-hidden className="brand-seal">
      <BrandGlyph className="size-5" />
    </span>
  );
}
