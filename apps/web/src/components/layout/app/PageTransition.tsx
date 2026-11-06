"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function PageTransition({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="terminal-page flex flex-1 flex-col">
      {children}
    </div>
  );
}
