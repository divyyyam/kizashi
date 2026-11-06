import { copy } from "@/content/copy";
import { Container } from "./Container";

/** FINAL-UI-ELEMENTS §6.3: one GitHub link and the legal line, nothing else. */
export function Footer() {
  return (
    <footer className="border-t border-border">
      <Container className="flex flex-col gap-2 py-8 md:flex-row md:items-center md:justify-between">
        <a
          href={copy.footer.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-10 w-fit items-center rounded-sm text-small text-text-muted transition-colors duration-120 hover:text-text focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {copy.footer.githubLabel}
        </a>
        <p className="text-small text-text-faint">{copy.footer.legal}</p>
      </Container>
    </footer>
  );
}
