"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { ActiveIndicator } from "./ActiveIndicator";
import { activeItem } from "./active-route";
import { NAV_GROUPS, NAV_ITEMS } from "./nav-items";

type SidebarNavProps = {
  readonly collapsed?: boolean;
  readonly onNavigate?: () => void;
};

/** Grouped app links. Collapsed, the group titles become hairlines and labels move to `title`. */
export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const active = activeItem(NAV_ITEMS, pathname);
  const navRef = useRef<HTMLElement>(null);
  return (
    <nav ref={navRef} aria-label={copy.nav.main} className="relative flex flex-col gap-5 px-3">
      <ActiveIndicator navRef={navRef} trackKey={`${active?.href ?? ""}:${collapsed}`} />
      {NAV_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-0.5">
          {collapsed ? (
            <span aria-hidden className="mx-3 mb-2 h-px bg-border" />
          ) : (
            <span data-shell="link" className="px-3 pb-1.5 text-label text-text-faint">
              {group.title}
            </span>
          )}
          {group.items.map((item) => {
            const current = item === active;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-shell="link"
                onClick={() => onNavigate?.()}
                aria-current={current ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex h-10 items-center gap-3 rounded-md px-3 text-small font-medium transition-colors duration-120",
                  collapsed && "justify-center px-0",
                  current ? "text-text" : "text-text-muted hover:bg-surface/60 hover:text-text",
                )}
              >
                <Icon
                  aria-hidden
                  strokeWidth={1.5}
                  className={cn(
                    "size-4 shrink-0 transition-transform duration-200 ease-out-soft group-hover:-translate-y-px",
                    current && "text-signal",
                  )}
                />
                {collapsed ? null : (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    <kbd className="font-mono text-label text-text-faint opacity-0 transition-opacity duration-120 group-hover:opacity-100">
                      g {item.key}
                    </kbd>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
