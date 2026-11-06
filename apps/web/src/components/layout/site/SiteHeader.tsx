import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/motion/ThemeToggle";
import { copy } from "@/content/copy";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-bar">
        <Logo />
        <nav aria-label={copy.nav.main} className="site-nav">
          <Link href="/markets">{copy.routes.markets}</Link>
          <Link href="/research">{copy.motion.research}</Link>
          <Link href="/about">{copy.motion.about}</Link>
        </nav>
        <div className="site-actions">
          <ThemeToggle />
          <Link className="site-launch" href="/markets" data-magnetic>
            {copy.nav.launch}
            <ArrowUpRight aria-hidden size={15} />
          </Link>
        </div>
      </div>
      <span aria-hidden className="site-progress" />
    </header>
  );
}
