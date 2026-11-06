import Link from "next/link";
import { copy } from "@/content/copy";

/** The logo: "Kizashi" in the display font, weight 600 (FINAL-UI-ELEMENTS §1). */
export function Wordmark() {
  return (
    <Link
      href="/"
      aria-label={copy.nav.home}
      className="flex min-h-10 items-center rounded-sm font-display text-h3 font-semibold text-text focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {copy.site.name}
    </Link>
  );
}
