"use client";

import "@/styles/globals.css";
import { MarketsLink } from "@/components/feedback/MarketsLink";
import { StatePanel } from "@/components/feedback/StatePanel";
import { copy } from "@/content/copy";

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg text-text">
        <main className="mx-auto flex min-h-dvh max-w-content flex-col justify-center gap-6 px-6 py-12">
          <h1 className="text-h1">{copy.feedback.pageError}</h1>
          <StatePanel kind="error" message={copy.feedback.pageHelp} retry={retry}>
            <MarketsLink />
          </StatePanel>
        </main>
      </body>
    </html>
  );
}
