import Link from "next/link";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { txUrl } from "@/lib/explorer";
import { appChain } from "@/lib/wagmi";
import type { CreateProgress } from "../lib/creation-progress";

type Props = {
  progress: Extract<CreateProgress, { phase: "done" | "failed" }>;
  retrying: boolean;
  onRetryListing: () => void;
};

export function CreationOutcome({ progress, retrying, onRetryListing }: Props) {
  if (progress.phase === "failed")
    return (
      <p role="alert" className="break-words text-warning">
        {progress.message}
      </p>
    );
  return (
    <div className="grid gap-4">
      <p className="text-text">{copy.feedback.create.live(progress.marketId.toString())}</p>
      {progress.listing.error ? (
        <div className="space-y-3">
          <p role="alert" className="break-words text-warning">
            {progress.listing.error}
          </p>
          <Button type="button" variant="secondary" disabled={retrying} onClick={onRetryListing}>
            {retrying ? copy.feedback.create.retrying : copy.feedback.create.retryListing}
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-4">
        <Link
          className="inline-flex min-h-10 items-center text-signal hover:underline"
          href={`/markets/${progress.marketId}`}
        >
          {copy.feedback.create.open}
        </Link>
        <a
          className="inline-flex min-h-10 items-center text-signal hover:underline"
          href={txUrl(appChain.id, progress.createTx)}
          target="_blank"
          rel="noreferrer"
        >
          {copy.feedback.create.receipt}
        </a>
      </div>
    </div>
  );
}
