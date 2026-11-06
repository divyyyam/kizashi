import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { MarketsLobby } from "@/features/markets";

export default function MarketsPage() {
  return (
    <Container className="flex flex-col gap-8 py-8 md:py-10">
      <PageHeader
        title={copy.markets.title}
        action={
          <Button asChild variant="secondary">
            <Link href="/markets/new">{copy.markets.create}</Link>
          </Button>
        }
      />
      <MarketsLobby />
    </Container>
  );
}
