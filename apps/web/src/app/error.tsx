"use client";

import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";

type ErrorPageProps = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

/** Shared route error boundary: a human sentence and a retry that re-renders the segment. */
export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <Container className="flex flex-col items-start gap-4 py-12">
      <p role="alert" className="text-body text-text-muted">
        {copy.errors.generic}
      </p>
      <Button onClick={reset} variant="secondary" size="md">
        {copy.errors.retry}
      </Button>
    </Container>
  );
}
