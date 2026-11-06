"use client";

import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export type SelectOption<T extends string = string> = {
  readonly value: T;
  readonly label: string;
};

type SelectProps<T extends string = string> = {
  readonly value: T;
  readonly onValueChange: (value: T) => void;
  readonly options: readonly SelectOption<T>[];
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly triggerClassName?: string;
};

/** Accessible dropdown select built on Radix DropdownMenu with custom keyboard navigation. */
export function Select<T extends string = string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  className,
  triggerClassName,
}: SelectProps<T>) {
  const currentOption = options.find((opt) => opt.value === value);
  const currentLabel = currentOption ? currentOption.label : value;

  return (
    <div className={cn("inline-flex flex-col", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className={cn(
              "group inline-flex h-10 min-w-36 items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 text-small text-text transition-colors duration-120",
              "hover:border-border-strong hover:bg-surface-raised",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal",
              "data-[state=open]:border-border-strong data-[state=open]:bg-surface-raised",
              triggerClassName,
            )}
          >
            <span className="truncate">{currentLabel}</span>
            <ChevronDown
              aria-hidden
              strokeWidth={1.5}
              className="size-4 shrink-0 text-text-muted transition-transform duration-150 group-data-[state=open]:rotate-180"
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          <DropdownMenuRadioGroup value={value} onValueChange={(val) => onValueChange(val as T)}>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Form-compatible styled native select wrapper with custom chevron for react-hook-form. */
export function NativeSelect({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative inline-flex w-full items-center">
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-md border border-border bg-surface pl-3 pr-9 text-small text-text transition-colors duration-120 cursor-pointer",
          "hover:border-border-strong",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal focus:border-border-strong",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        strokeWidth={1.5}
        className="pointer-events-none absolute right-3 size-4 text-text-muted"
      />
    </div>
  );
}
