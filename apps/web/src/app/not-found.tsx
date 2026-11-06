import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeading } from "@/components/layout/PageHeading";
import { copy } from "@/content/copy";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-start gap-4 py-12">
      <PageHeading>{copy.errors.notFound}</PageHeading>
      <Link
        href="/"
        className="rounded-sm text-body text-text-muted underline underline-offset-4 transition-colors duration-120 hover:text-text focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {copy.errors.goHome}
      </Link>
    </Container>
  );
}
