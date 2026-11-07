import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import "./loading-region.css";

/** Reserves the final layout immediately; fast reads finish before the skeleton appears. */
export function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" className={cn("loading-region", className)}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
