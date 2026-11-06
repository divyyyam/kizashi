"use client";

import { Moon, Sun } from "lucide-react";
import type { MouseEvent } from "react";
import { copy } from "@/content/copy";

let switchTimer: ReturnType<typeof setTimeout> | undefined;

export function ThemeToggle() {
  function toggle(event: MouseEvent<HTMLButtonElement>) {
    const root = document.documentElement;
    const nextTheme = root.dataset.theme === "light" ? "dark" : "light";

    // Mark theme as switching so kinetic accent animations fire
    root.dataset.themeSwitching = "true";
    if (switchTimer !== undefined) clearTimeout(switchTimer);
    switchTimer = setTimeout(() => {
      delete root.dataset.themeSwitching;
      switchTimer = undefined;
    }, 750);

    const applyTheme = () => {
      root.dataset.theme = nextTheme;
      try {
        localStorage.setItem("kizashi-theme", nextTheme);
      } catch {
        // Fallback when storage is disabled
      }
    };

    const doc = document as Document & {
      startViewTransition?: (update: () => void) => { ready: Promise<void> };
    };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reduceMotion && typeof doc.startViewTransition === "function") {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      const transition = doc.startViewTransition(applyTheme);
      transition.ready.then(() => {
        root.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`],
          },
          {
            duration: 480,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      });
    } else {
      applyTheme();
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={copy.motion.theme}
      title={copy.motion.theme}
      className="theme-toggle relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full text-text-muted hover:bg-surface-raised hover:text-text"
    >
      <Sun aria-hidden size={17} className="theme-sun" />
      <Moon aria-hidden size={17} className="theme-moon" />
    </button>
  );
}
