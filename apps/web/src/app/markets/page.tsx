import { Container } from "@/components/layout/Container";
import { PageHeading } from "@/components/layout/PageHeading";
import { copy } from "@/content/copy";

export default function MarketsPage() {
  return (
    <Container className="py-12">
      <PageHeading>{copy.routes.markets}</PageHeading>
    </Container>
  );
}
