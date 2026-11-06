"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";

type NavLinksProps = {
  readonly className?: string;
  readonly onNavigate?: () => void;
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Primary links in §6.1 order; `/markets/123` keeps "Markets" active. */
export function NavLinks({ className, onNavigate }: NavLinksProps) {
  const pathname = usePathname();
  return (
    <ul className={cn("flex gap-1", className)}>
      {copy.nav.links.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={() => onNavigate?.()}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center rounded-sm px-3 text-body transition-colors duration-120 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent",
                active ? "text-text" : "text-text-muted hover:text-text",
              )}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
