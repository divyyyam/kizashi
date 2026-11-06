import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { PageHeading } from "./PageHeading";

type PageHeaderProps = {
  readonly title: ReactNode;
  readonly eyebrow?: ReactNode;
  readonly description?: ReactNode;
  readonly action?: ReactNode;
  readonly className?: string;
};

/** Standardized page header with eyebrow badge, title, optional description, and action slot. */
export function PageHeader({ title, eyebrow, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-6", className)}>
      <div className="flex flex-col gap-2">
        {eyebrow ? (
          typeof eyebrow === "string" ? (
            <span className="text-label text-signal">{eyebrow}</span>
          ) : (
            eyebrow
          )
        ) : null}
        <PageHeading>{title}</PageHeading>
        {description ? <p className="max-w-2xl text-small text-text-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-3">{action}</div> : null}
    </div>
  );
}
