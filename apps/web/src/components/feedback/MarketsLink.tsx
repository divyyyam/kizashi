import Link from "next/link";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";

export function MarketsLink() {
  return (
    <Button asChild variant="secondary">
      <Link href="/markets">{copy.feedback.markets}</Link>
    </Button>
  );
}
