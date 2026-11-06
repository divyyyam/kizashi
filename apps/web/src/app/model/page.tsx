import { Container } from "@/components/layout/Container";
import { PageHeading } from "@/components/layout/PageHeading";
import { copy } from "@/content/copy";

export default function ModelPage() {
  return (
    <Container className="py-12">
      <PageHeading>{copy.routes.model}</PageHeading>
    </Container>
  );
}
