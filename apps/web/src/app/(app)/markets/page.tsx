import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { MarketsLobby } from "@/features/markets";

export default function MarketsPage() {
  return (
    <section className="flex w-full min-w-0 flex-col gap-6 px-4 py-6 md:px-6 md:py-8 lg:px-8">
      <PageHeader
        title={copy.markets.title}
        description={copy.feedback.marketsHelp}
        action={
          <Button asChild variant="secondary">
            <Link href="/markets/new">{copy.markets.create}</Link>
          </Button>
        }
      />
      <MarketsLobby />
    </section>
  );
}
