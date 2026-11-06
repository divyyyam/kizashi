import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Container } from "@/components/layout/Container";
import { PageHeading } from "@/components/layout/PageHeading";
import { copy } from "@/content/copy";
import { MarketList } from "@/features/markets";
export default function MarketsLoading() {
  return (
    <Container className="flex flex-col gap-8 py-12">
      <PageHeading>{copy.markets.title}</PageHeading>
      <NuqsAdapter>
        <MarketList result={{ status: "loading" }} />
      </NuqsAdapter>
    </Container>
  );
}
