import { Container } from "@/components/layout/Container";
import { copy } from "@/content/copy";
export default function MarketLoading() {
  return (
    <Container className="flex flex-col gap-8 py-12">
      <div
        role="status"
        aria-label={copy.market.loading}
        aria-busy="true"
        className="flex flex-col gap-8"
      >
        <div className="h-12 w-3/4 rounded-sm bg-surface" />
        <div className="grid-page">
          <div className="col-span-4 h-chart rounded-md border bg-surface md:col-span-8 lg:col-span-7 lg:h-chart-desktop" />
          <div className="hidden rounded-md border bg-surface lg:col-span-5 lg:block" />
        </div>
      </div>
    </Container>
  );
}
