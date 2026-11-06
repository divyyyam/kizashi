import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Container } from "@/components/layout/Container";
import { ModelScreen } from "@/features/model";

export default function ModelPage() {
  return (
    <Container className="model-route flex max-w-wide flex-1 flex-col py-3 lg:px-5">
      <NuqsAdapter>
        <ModelScreen />
      </NuqsAdapter>
    </Container>
  );
}
