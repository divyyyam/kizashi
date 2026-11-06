"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { EASE_OUT, gsap, MOTION_OK, useGSAP } from "@/lib/motion/gsap";
import { NAV_ITEMS, type NavItem } from "./nav-items";

type CommandPaletteProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
};

/** Ctrl K page jump. Filters the app pages by name; arrows move, Enter opens. */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-bg/80" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-surface-raised"
        >
          <DialogPrimitive.Title className="sr-only">
            {copy.shell.palette.title}
          </DialogPrimitive.Title>
          {open ? <PaletteBody onDone={() => onOpenChange(false)} /> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function PaletteBody({ onDone }: { readonly onDone: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (ref.current === null || !window.matchMedia(MOTION_OK).matches) return;
      gsap
        .timeline({ defaults: { ease: EASE_OUT } })
        .from(ref.current, { autoAlpha: 0, y: -16, scale: 0.97, duration: 0.45 })
        .from("li", { autoAlpha: 0, y: 8, stagger: 0.04, duration: 0.4 }, 0.08);
    },
    { scope: ref },
  );
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const needle = query.trim().toLowerCase();
  const results = NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(needle));
  const selected = Math.min(index, Math.max(results.length - 1, 0));

  const go = (item: NavItem | undefined) => {
    if (item === undefined) return;
    onDone();
    router.push(item.href);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setIndex((selected + step + results.length) % Math.max(results.length, 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[selected]);
    }
  };

  return (
    <div ref={ref}>
      <div className="flex items-center gap-3 border-b border-border px-4">
        <Search aria-hidden strokeWidth={1.5} className="size-4 text-text-faint" />
        <input
          // biome-ignore lint/a11y/noAutofocus: the dialog exists only to take this input.
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={copy.shell.palette.placeholder}
          aria-label={copy.shell.palette.placeholder}
          className="h-12 flex-1 bg-transparent text-body text-text outline-none placeholder:text-text-faint"
        />
      </div>
      <ul className="flex flex-col p-2">
        {results.map((item, position) => (
          <li key={item.href}>
            <button
              type="button"
              onClick={() => go(item)}
              onMouseEnter={() => setIndex(position)}
              className={cn(
                "flex h-10 w-full items-center gap-3 rounded-md px-3 text-small text-text-muted",
                position === selected && "bg-surface text-text",
              )}
            >
              <item.icon aria-hidden strokeWidth={1.5} className="size-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {position === selected ? (
                <CornerDownLeft aria-hidden strokeWidth={1.5} className="size-3.5" />
              ) : null}
            </button>
          </li>
        ))}
        {results.length === 0 ? (
          <li className="px-3 py-3 text-small text-text-faint">{copy.shell.palette.empty}</li>
        ) : null}
      </ul>
      <p className="border-t border-border px-4 py-2.5 text-label text-text-faint">
        {copy.shell.palette.hint}
      </p>
    </div>
  );
}
