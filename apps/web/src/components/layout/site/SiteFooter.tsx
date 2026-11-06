import Link from "next/link";
import { copy } from "@/content/copy";
import { formatUsdc } from "@/lib/format";
import { readVenueTotals } from "@/lib/venue-data";

export function SiteFooter() {
  const result = readVenueTotals();
  const totals = result.status === "ready" ? result.data : undefined;
  const stats = [
    [copy.motion.volume, totals && formatUsdc(totals.volumeUsdc, { suffix: true })],
    [copy.motion.saved, totals && formatUsdc(totals.savedUsdc, { suffix: true })],
    [copy.motion.active, totals?.activeMarkets],
  ] as const;
  return (
    <footer className="venue-footer">
      <div className="footer-data">
        <dl>
          {stats.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd className={label === copy.motion.saved ? "text-saved" : ""}>
                {value ?? (
                  <>
                    <span className="sr-only">{copy.motion.unavailable}</span>
                    <span aria-hidden>—</span>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
        {result.status !== "ready" && (
          <p className="text-small text-text-faint">
            {result.status === "unavailable" ? result.reason : copy.motion.unavailable}
          </p>
        )}
      </div>
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
