"use client";

import { useTransition } from "react";
import { MarketsLink } from "@/components/feedback/MarketsLink";
import { StatePanel } from "@/components/feedback/StatePanel";
import { Container } from "@/components/layout/Container";
import { copy } from "@/content/copy";

type ErrorPageProps = {
  readonly error: unknown;
  readonly retry: () => void;
};

/** Shared route error boundary: a human sentence and a retry that re-renders the segment. */
export default function ErrorPage({ retry }: ErrorPageProps) {
  const [pending, startTransition] = useTransition();
  return (
    <Container className="flex flex-col items-start gap-4 py-12">
      <h1 className="font-display text-h1 text-text">{copy.feedback.pageError}</h1>
      <div className="w-full">
        <StatePanel
          kind="error"
          message={copy.feedback.pageHelp}
          retry={() => startTransition(retry)}
          busy={pending}
        >
          <MarketsLink />
        </StatePanel>
      </div>
    </Container>
  );
}
