import { copy } from "@/content/copy";
import { ConnectButton } from "@/features/wallet";
import { Container } from "./Container";
import { MobileNav } from "./MobileNav";
import { NavLinks } from "./NavLinks";
import { Wordmark } from "./Wordmark";

/** Sticky 56 px bar on solid `--bg` with a bottom border, no blur (FINAL-UI-ELEMENTS §6.1). */
export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <Container className="flex h-14 items-center justify-between gap-4">
        <Wordmark />
        <nav aria-label={copy.nav.main} className="hidden md:block">
          <NavLinks />
        </nav>
        <div className="hidden md:block">
          <ConnectButton />
        </div>
        <MobileNav />
      </Container>
    </header>
  );
}
