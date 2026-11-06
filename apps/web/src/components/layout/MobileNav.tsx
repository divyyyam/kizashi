"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { copy } from "@/content/copy";
import { ConnectButton } from "@/features/wallet";
import { NavLinks } from "./NavLinks";

/** Below `md`: a sheet from the right with stacked links and the wallet button at the bottom. */
export function MobileNav() {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  // Tracking the path the sheet was opened on closes it on any route change without an effect.
  const open = openPath === pathname;

  return (
    <Sheet open={open} onOpenChange={(next) => setOpenPath(next ? pathname : null)}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="size-10 px-0 md:hidden" aria-label={copy.nav.openMenu}>
          <Menu aria-hidden className="size-5" strokeWidth={1.5} />
        </Button>
      </SheetTrigger>
      <SheetContent className="gap-6 p-4">
        <div className="flex items-center justify-between">
          <SheetTitle className="text-h3 font-semibold text-text">{copy.site.name}</SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" className="size-10 px-0" aria-label={copy.nav.closeMenu}>
              <X aria-hidden className="size-5" strokeWidth={1.5} />
            </Button>
          </SheetClose>
        </div>
        <nav aria-label={copy.nav.main}>
          <NavLinks className="flex-col" onNavigate={() => setOpenPath(null)} />
        </nav>
        <ConnectButton className="mt-auto w-full" />
      </SheetContent>
    </Sheet>
  );
}
