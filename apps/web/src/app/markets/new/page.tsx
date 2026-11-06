import { Container } from "@/components/layout/Container";
import { PageHeading } from "@/components/layout/PageHeading";
import { copy } from "@/content/copy";

export default function CreateMarketPage() {
  return (
    <Container className="py-12">
      <PageHeading>{copy.routes.marketsNew}</PageHeading>
    </Container>
  );
}
