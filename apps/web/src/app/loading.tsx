import { PageSkeleton } from "@/components/feedback/PageSkeleton";
import { Container } from "@/components/layout/Container";

/** Shared route loading state: a skeleton the size of a page heading. */
export default function Loading() {
  return (
    <Container className="py-12">
      <PageSkeleton />
    </Container>
  );
}
