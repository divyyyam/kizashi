import { RemoteImage } from "@/components/feedback/RemoteImage";
import { copy } from "@/content/copy";
import { MarketProofLinks } from "./MarketProofLinks";
import { MarketResolution } from "./MarketResolution";
import type { MarketMetaView } from "./metadata-response";

export function MarketDetails({ details }: { details: MarketMetaView }) {
  const { metadata, imageUrl, metadataUrl, listing } = details;
  const text = copy.feedback.metadata;
  return (
    <div className="grid min-w-0 gap-5">
      <div className="flex items-start gap-4">
        {imageUrl ? (
          <RemoteImage
            src={imageUrl}
            width={80}
            height={80}
            className="size-20 shrink-0 rounded-lg border border-border object-cover"
          />
        ) : null}
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-label text-text-faint">
            <span className="capitalize">{metadata.category}</span>
            {metadata.tags.map((tag) => (
              <span
                key={tag}
                className="max-w-full break-words rounded-full border border-border px-2 py-1"
              >
                #{tag}
              </span>
            ))}
          </div>
          {metadata.description ? (
            <p className="break-words whitespace-pre-line text-small text-text-muted">
              {metadata.description}
            </p>
          ) : null}
        </div>
      </div>
      <p className="break-words text-small">
        {metadata.outcomes.kind === "binary" ? (
          <>
            {text.outcomes}: {metadata.outcomes.yes} / {metadata.outcomes.no}
          </>
        ) : (
          <>
            {text.range}: {metadata.outcomes.low}–{metadata.outcomes.high} {metadata.outcomes.unit}{" "}
            · {text.buckets(metadata.outcomes.buckets)}
          </>
        )}
      </p>
      <MarketResolution metadata={metadata} />
      <MarketProofLinks metadataUrl={metadataUrl} listingUrl={listing.url} />
    </div>
  );
}
