import { ExternalLink, ShieldCheck } from "lucide-react";
import { copy } from "@/content/copy";

export function MarketProofLinks({ listingUrl }: { listingUrl: string }) {
  const text = copy.feedback.metadata;
  return (
    <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4 text-small text-text-muted">
      <span className="inline-flex items-center gap-2 text-saved">
        <ShieldCheck aria-hidden className="size-4" />
        {text.verified}
      </span>
      <a
        href={listingUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-10 items-center gap-2 hover:text-text"
      >
        {text.arkiv}
        <ExternalLink aria-hidden className="size-3.5" />
      </a>
    </div>
  );
}
