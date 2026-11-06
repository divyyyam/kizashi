"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;

export function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-56 rounded-md border border-border bg-surface-raised p-1 text-text shadow-lg shadow-black/40",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-2 text-small text-text-muted outline-none transition-colors duration-120 data-[highlighted]:bg-surface data-[highlighted]:text-text",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      className={cn(
        "flex min-h-10 cursor-pointer select-none items-center justify-between gap-3 rounded-sm px-2.5 text-small text-text-muted outline-none transition-colors duration-120 data-[highlighted]:bg-surface data-[highlighted]:text-text data-[state=checked]:text-text data-[state=checked]:font-medium",
        className,
      )}
      {...props}
    >
      <span className="flex-1 truncate">{children}</span>
      <DropdownMenuPrimitive.ItemIndicator className="inline-flex items-center text-signal">
        <Check aria-hidden strokeWidth={2} className="size-3.5" />
      </DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.RadioItem>
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      className={cn(
        "flex min-h-10 cursor-pointer select-none items-center justify-between gap-3 rounded-sm px-2.5 text-small text-text-muted outline-none transition-colors duration-120 data-[highlighted]:bg-surface data-[highlighted]:text-text data-[state=checked]:text-text",
        className,
      )}
      {...props}
    >
      <span className="flex-1 truncate">{children}</span>
      <DropdownMenuPrimitive.ItemIndicator className="inline-flex items-center text-signal">
        <Check aria-hidden strokeWidth={2} className="size-3.5" />
      </DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label className={cn("px-2 py-2 text-small", className)} {...props} />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}
