import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { copy } from "@/content/copy";
import { PortfolioSkeleton } from "@/features/portfolio";

export default function Loading() {
  return (
    <Container className="flex max-w-wide flex-col gap-6 py-6 md:py-8">
      <PageHeader title={copy.portfolio.title} description={copy.feedback.portfolioHelp} />
      <PortfolioSkeleton />
    </Container>
  );
}
