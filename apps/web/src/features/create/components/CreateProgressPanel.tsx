"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { txUrl } from "@/lib/explorer";
import { appChain } from "@/lib/wagmi";
import type { CreateProgress, CreateStep } from "../hooks/use-create-market";

const LABELS: Record<CreateStep, string> = {
  image: "Pin image to IPFS",
  metadata: "Pin market metadata to IPFS",
  approve: "Approve USDC for initial liquidity",
  create: "Create the market on Arc",
  listing: "Publish the listing on Arkiv",
};
const ORDER: CreateStep[] = ["image", "metadata", "approve", "create", "listing"];

export function CreateProgressPanel({
  progress,
  hasImage,
  onRetryListing,
}: {
  progress: CreateProgress;
  hasImage: boolean;
  onRetryListing: () => void;
}) {
  if (progress.phase === "idle") return null;
  const steps = ORDER.filter((s) => s !== "image" || hasImage);
  const current = progress.phase === "done" ? undefined : progress.step;
  const currentIndex = current ? steps.indexOf(current) : steps.length;
  return (
    <section
      aria-live="polite"
      className="grid gap-3 rounded-lg border border-border p-4 text-small"
    >
      <ol className="grid gap-2">
        {steps.map((step, i) => {
          const state =
            progress.phase === "done"
              ? step === "listing" && progress.listing.error
                ? "failed"
                : "done"
              : i < currentIndex
                ? "done"
                : i === currentIndex
                  ? progress.phase === "failed"
                    ? "failed"
                    : "active"
                  : "todo";
          return (
            <li key={step} className="flex items-center gap-3">
              <span
                className={
                  state === "done"
                    ? "text-positive"
                    : state === "failed"
                      ? "text-negative"
                      : state === "active"
                        ? "text-signal"
                        : "text-text-faint"
                }
              >
                {state === "done" ? "✓" : state === "failed" ? "✕" : state === "active" ? "…" : "○"}
              </span>
              <span className={state === "todo" ? "text-text-faint" : "text-text"}>
                {LABELS[step]}
              </span>
            </li>
          );
        })}
      </ol>
      {progress.phase === "running" && progress.txHash ? (
        <a
          className="text-signal underline-offset-4 hover:underline"
          href={txUrl(appChain.id, progress.txHash)}
          target="_blank"
          rel="noreferrer"
        >
          View transaction
        </a>
      ) : null}
      {progress.phase === "failed" ? (
        <p role="alert" className="text-negative">
          {progress.message}
        </p>
      ) : null}
      {progress.phase === "done" ? (
        <div className="grid gap-2">
          <p className="text-text">Market #{progress.marketId.toString()} is live.</p>
          {progress.listing.error ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-negative">Arkiv listing failed: {progress.listing.error}</p>
              <Button type="button" variant="secondary" onClick={onRetryListing}>
                Retry listing
              </Button>
            </div>
          ) : null}
          <div className="flex gap-4">
            <Link
              className="text-signal underline-offset-4 hover:underline"
              href={`/markets/${progress.marketId.toString()}`}
            >
              Open the market
            </Link>
            <a
              className="text-signal underline-offset-4 hover:underline"
              href={txUrl(appChain.id, progress.createTx)}
              target="_blank"
              rel="noreferrer"
            >
              Creation transaction
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}
