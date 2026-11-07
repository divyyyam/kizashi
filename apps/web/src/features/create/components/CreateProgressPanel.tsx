"use client";

import { copy } from "@/content/copy";
import { txUrl } from "@/lib/explorer";
import { appChain } from "@/lib/wagmi";
import type { CreateProgress } from "../lib/creation-progress";
import { CreateProgressTrack } from "./CreateProgressTrack";
import { CreationOutcome } from "./CreationOutcome";

type Props = {
  progress: CreateProgress;
  hasImage: boolean;
  retrying: boolean;
  onRetryListing: () => void;
};

export function CreateProgressPanel({ progress, hasImage, retrying, onRetryListing }: Props) {
  if (progress.phase === "idle") return null;
  return (
    <section
      aria-live="polite"
      className="grid min-w-0 gap-5 rounded-xl border border-border p-5 text-small"
    >
      <CreateProgressTrack progress={progress} hasImage={hasImage} />
      {(progress.phase === "running" || progress.phase === "failed") && progress.txHash ? (
        <a
          className="text-signal underline-offset-4 hover:underline"
          href={txUrl(appChain.id, progress.txHash)}
          target="_blank"
          rel="noreferrer"
        >
          {copy.feedback.create.transaction}
        </a>
      ) : null}
      {progress.phase === "failed" || progress.phase === "done" ? (
        <CreationOutcome progress={progress} retrying={retrying} onRetryListing={onRetryListing} />
      ) : null}
    </section>
  );
}
