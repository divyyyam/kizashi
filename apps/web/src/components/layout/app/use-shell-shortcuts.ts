"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { NAV_ITEMS } from "./nav-items";

// Window for the second key of a "g then key" jump.
const LEADER_WINDOW_MS = 900;

type ShellShortcuts = {
  readonly onPalette: () => void;
  readonly onToggleSidebar: () => void;
};

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest("input, textarea, select, [contenteditable], [role='dialog']") !== null
  );
}

/** Ctrl/Cmd K opens the palette, `[` toggles the sidebar, `g` then a key jumps to a page. */
export function useShellShortcuts({ onPalette, onToggleSidebar }: ShellShortcuts): void {
  const router = useRouter();
  useEffect(() => {
    let leaderAt = 0;
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector(".wallet-dialog, [data-rk] [role='dialog']")) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onPalette();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (event.key === "[") {
        onToggleSidebar();
      } else if (event.key === "g") {
        leaderAt = event.timeStamp;
      } else if (event.timeStamp - leaderAt < LEADER_WINDOW_MS) {
        leaderAt = 0;
        const page = NAV_ITEMS.find((item) => item.key === event.key);
        if (page !== undefined) router.push(page.href);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, onPalette, onToggleSidebar]);
}
