"use client";

import { AlertCircle, Inbox, Unplug } from "lucide-react";
import type { ReactNode } from "react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { RetryButton } from "./RetryButton";

type Props = {
  kind: "error" | "empty" | "unavailable";
  title?: string | undefined;
  message: string;
  retry?: (() => void) | undefined;
  busy?: boolean | undefined;
  retryAt?: number | undefined;
  compact?: boolean;
  children?: ReactNode;
};

export function StatePanel({
  kind,
  title,
  message,
  retry,
  busy,
  retryAt,
  compact,
  children,
}: Props) {
  const Icon = kind === "error" ? AlertCircle : kind === "empty" ? Inbox : Unplug;
  return (
    <section
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "flex min-w-0 flex-col items-start gap-4 rounded-xl border border-border bg-surface",
        compact ? "p-5" : "px-6 py-10 md:px-8 md:py-14",
      )}
    >
      <Icon
        aria-hidden
        strokeWidth={1.5}
        className={cn("size-6", kind === "error" ? "text-warning" : "text-text-faint")}
      />
      <div className="max-w-xl space-y-2">
        <h2 className={compact ? "text-h3 text-text" : "font-display text-h2 text-text"}>
          {title ?? copy.feedback[kind]}
        </h2>
        <p className="break-words text-small text-text-muted">{message}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {retry ? <RetryButton retry={retry} busy={busy} retryAt={retryAt} /> : null}
        {children}
      </div>
    </section>
  );
}
