import { Container } from "@/components/layout/Container";
import { PageHeading } from "@/components/layout/PageHeading";
import { copy } from "@/content/copy";

export default function PortfolioPage() {
  return (
    <Container className="py-12">
      <PageHeading>{copy.routes.portfolio}</PageHeading>
    </Container>
  );
}
