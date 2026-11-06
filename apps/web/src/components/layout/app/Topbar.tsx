"use client";

import { Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/motion/ThemeToggle";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { ConnectButton } from "@/features/wallet";
import { activeItem } from "./active-route";
import { NetworkBadge } from "./NetworkBadge";
import { NAV_ITEMS } from "./nav-items";

type TopbarProps = {
  readonly onMenu: () => void;
  readonly onPalette: () => void;
};

/** Sticky app bar: section title, page jump, network and wallet. Solid, hairline below, no blur. */
export function Topbar({ onMenu, onPalette }: TopbarProps) {
  const pathname = usePathname();
  const section = activeItem(NAV_ITEMS, pathname);
  return (
    <header
      data-enter
      data-shell="topbar"
      className="sticky top-0 z-30 flex h-topbar shrink-0 items-center gap-3 border-b border-border bg-bg px-4 md:px-6"
    >
      <Button
        variant="ghost"
        className="size-10 px-0 lg:hidden"
        onClick={onMenu}
        aria-label={copy.nav.openMenu}
      >
        <Menu aria-hidden strokeWidth={1.5} className="size-5" />
      </Button>
      <Logo markOnly className="lg:hidden" />
      {section === undefined ? null : (
        <p className="hidden items-center gap-2 text-small md:flex">
          <span className="text-text-faint">{copy.site.name}</span>
          <span aria-hidden className="text-text-faint">
            /
          </span>
          <span className="text-text">{section.label}</span>
        </p>
      )}
      <button
        type="button"
        onClick={onPalette}
        className="ml-auto hidden h-9 w-56 items-center gap-2 rounded-md border border-border bg-surface px-3 text-small text-text-faint transition-colors duration-120 hover:border-border-strong hover:text-text-muted md:flex"
      >
        <Search aria-hidden strokeWidth={1.5} className="size-4" />
        <span className="flex-1 text-left">{copy.shell.jump}</span>
        <kbd className="font-mono text-label">{copy.shell.jumpShortcut}</kbd>
      </button>
      <ThemeToggle />
      <NetworkBadge className="hidden xl:inline-flex" />
      <ConnectButton className="ml-auto md:ml-0" />
    </header>
  );
}
