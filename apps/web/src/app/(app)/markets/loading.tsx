import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { MarketFiltersSkeleton, MarketsSkeleton } from "@/features/markets";

export default function Loading() {
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
      <div className="flex flex-col gap-8">
        <MarketFiltersSkeleton />
        <MarketsSkeleton />
      </div>
    </section>
  );
}
