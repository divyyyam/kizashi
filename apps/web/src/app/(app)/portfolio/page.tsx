import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { copy } from "@/content/copy";
import { PortfolioScreen } from "@/features/portfolio";

export default function PortfolioPage() {
  return (
    <Container className="flex flex-col gap-8 py-8 md:py-10">
      <PageHeader title={copy.portfolio.title} />
      <PortfolioScreen />
    </Container>
  );
}
