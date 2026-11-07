import { copy } from "@/content/copy";
import { formatUsdc } from "@/lib/format";
import { readVenueTotals } from "@/lib/venue-data";

export function FooterVenueData() {
  const result = readVenueTotals();
  const totals = result.status === "ready" ? result.data : undefined;
  const stats = [
    [copy.motion.volume, totals && formatUsdc(totals.volumeUsdc, { suffix: true })],
    [copy.motion.saved, totals && formatUsdc(totals.savedUsdc, { suffix: true })],
    [copy.motion.active, totals?.activeMarkets],
  ] as const;
  return (
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
  );
}
