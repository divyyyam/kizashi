import Link from "next/link";
import { copy } from "@/content/copy";
import { FooterVenueData } from "./FooterVenueData";

export function SiteFooter() {
  return (
    <footer className="venue-footer">
      <FooterVenueData />
      <Link className="footer-word" href="/" aria-label={copy.nav.home}>
        <span lang="ja" className="font-jp">
          {copy.motion.mark}
        </span>
        {copy.site.name}
      </Link>
      <div className="footer-links">
        <p>{copy.footer.legal}</p>
        <nav aria-label={copy.story.footerNav}>
          <Link href="/about">{copy.motion.about}</Link>
          <Link href="/research">{copy.motion.research}</Link>
          <Link href="/markets">{copy.markets.title}</Link>
          <a href={copy.footer.githubUrl}>{copy.footer.githubLabel}</a>
        </nav>
      </div>
    </footer>
  );
}
