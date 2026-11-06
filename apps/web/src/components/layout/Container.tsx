import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ContainerProps = {
  readonly children: ReactNode;
  readonly className?: string;
};

/** Centres content at the 1200 px max width with 16 / 24 / 32 px side padding (UI-guide §3). */
export function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-content px-4 md:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}
