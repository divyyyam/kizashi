import { Container } from "@/components/layout/Container";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/content/copy";

/** Shared route loading state: a skeleton the size of a page heading. */
export default function Loading() {
  return (
    <Container className="py-12">
      <div role="status" aria-label={copy.loading.page}>
        <Skeleton className="h-11 w-48" />
      </div>
    </Container>
  );
}
