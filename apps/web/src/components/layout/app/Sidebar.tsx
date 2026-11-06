"use client";

import { ArrowUpRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { SidebarNav } from "./SidebarNav";

type SidebarProps = {
  readonly collapsed: boolean;
  readonly onToggle: () => void;
};

/** Fixed desktop sidebar from `lg`: brand, grouped navigation, source link and collapse control. */
export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <aside
      data-enter
      data-shell="sidebar"
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-surface-raised lg:flex",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar",
      )}
    >
      <div
        className={cn(
          "flex h-topbar shrink-0 items-center border-b border-border",
          collapsed ? "justify-center" : "justify-between pr-3 pl-5",
        )}
      >
        <Logo markOnly={collapsed} />
        {collapsed ? null : (
          <CollapseButton icon={ToggleIcon} onToggle={onToggle} label={copy.shell.collapse} />
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-5">
        <SidebarNav collapsed={collapsed} />
      </div>
      <div
        className={cn(
          "flex flex-col gap-1 border-t border-border p-3",
          collapsed && "items-center",
        )}
      >
        {collapsed ? (
          <CollapseButton icon={ToggleIcon} onToggle={onToggle} label={copy.shell.expand} />
        ) : null}
        <a
          href={copy.footer.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={collapsed ? copy.shell.source : undefined}
          className={cn(
            "flex h-10 items-center gap-3 rounded-md px-3 text-small text-text-muted transition-colors duration-120 hover:bg-surface hover:text-text",
            collapsed && "justify-center px-0 w-10",
          )}
        >
          <ArrowUpRight aria-hidden strokeWidth={1.5} className="size-4 shrink-0" />
          {collapsed ? <span className="sr-only">{copy.shell.source}</span> : copy.shell.source}
        </a>
      </div>
    </aside>
  );
}

type CollapseButtonProps = {
  readonly icon: typeof PanelLeftClose;
  readonly label: string;
  readonly onToggle: () => void;
};

function CollapseButton({ icon: Icon, label, onToggle }: CollapseButtonProps) {
  return (
    <Button
      variant="ghost"
      className="size-10 px-0"
      onClick={onToggle}
      aria-label={label}
      title={`${label} ( [ )`}
    >
      <Icon aria-hidden strokeWidth={1.5} className="size-4" />
    </Button>
  );
}
