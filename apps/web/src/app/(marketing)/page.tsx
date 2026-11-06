import { Container } from "@/components/layout/Container";
import { copy } from "@/content/copy";

/** Landing `/`. Sections arrive with UI-04 once FINAL-UI-ELEMENTS §6.2 copy is approved. */
export default function LandingPage() {
  return (
    <Container className="py-16">
      <h1 className="text-display font-semibold text-text">{copy.site.name}</h1>
    </Container>
  );
}
