import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { copy } from "@/content/copy";
import { CreateMarketForm } from "@/features/create";

export default function CreateMarketPage() {
  return (
    <Container className="flex flex-col gap-8 py-8 md:py-10">
      <PageHeader title={copy.create.title} />
      <CreateMarketForm />
    </Container>
  );
}
