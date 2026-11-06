import { Container } from "@/components/layout/Container";
import { PageHeading } from "@/components/layout/PageHeading";
import { copy } from "@/content/copy";
import { PortfolioView } from "@/features/portfolio";
export default function PortfolioLoading() {
  return (
    <Container className="flex flex-col gap-8 py-12">
      <PageHeading>{copy.portfolio.title}</PageHeading>
      <PortfolioView result={{ status: "loading" }} />
    </Container>
  );
}
