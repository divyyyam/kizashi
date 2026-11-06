"use client";

import { type ReactNode, useCallback, useState, useSyncExternalStore } from "react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { CommandPalette } from "./CommandPalette";
import { MobileSidebar } from "./MobileSidebar";
import { PageTransition } from "./PageTransition";
import { Sidebar } from "./Sidebar";
import {
  collapsedServerSnapshot,
  collapsedSnapshot,
  setCollapsed,
  subscribeCollapsed,
} from "./sidebar-store";
import { Topbar } from "./Topbar";
import { useShellShortcuts } from "./use-shell-shortcuts";

type AppShellProps = {
  readonly children: ReactNode;
};

/** The dashboard frame: fixed sidebar from `lg`, sticky top bar, page column, footer note. */
export function AppShell({ children }: AppShellProps) {
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    collapsedSnapshot,
    collapsedServerSnapshot,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const toggleSidebar = useCallback(() => setCollapsed(!collapsedSnapshot()), []);
  const togglePalette = useCallback(() => setPaletteOpen((open) => !open), []);
  useShellShortcuts({ onPalette: togglePalette, onToggleSidebar: toggleSidebar });
  return (
    <div className="min-h-dvh">
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
      >
        {copy.shell.skip}
      </a>
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <MobileSidebar open={drawerOpen} onOpenChange={setDrawerOpen} />
      <div
        className={cn(
          "flex min-h-dvh flex-col",
          collapsed ? "lg:pl-sidebar-collapsed" : "lg:pl-sidebar",
        )}
      >
        <Topbar onMenu={() => setDrawerOpen(true)} onPalette={() => setPaletteOpen(true)} />
        <main id="app-main" className="flex flex-1 flex-col">
          <PageTransition>{children}</PageTransition>
        </main>
        <footer className="border-t border-border px-4 py-4 text-small text-text-faint md:px-6">
          {copy.shell.footer}
        </footer>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
