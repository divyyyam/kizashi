import { Container } from "@/components/layout/Container";
import { MarketSkeleton } from "@/features/market";

export default function Loading() {
  return (
    <Container className="py-8 md:py-10">
      <MarketSkeleton />
    </Container>
  );
}
