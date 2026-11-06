"use client";

import { X } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { copy } from "@/content/copy";
import { SidebarNav } from "./SidebarNav";

type MobileSidebarProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
};

/** Below `lg` the sidebar is a sheet from the left; choosing a link closes it. */
export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="gap-5">
        <div className="flex h-topbar items-center justify-between border-b border-border pr-3 pl-5">
          <SheetTitle asChild>
            <div>
              <Logo />
            </div>
          </SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" className="size-10 px-0" aria-label={copy.nav.closeMenu}>
              <X aria-hidden strokeWidth={1.5} className="size-5" />
            </Button>
          </SheetClose>
        </div>
        <SidebarNav onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
