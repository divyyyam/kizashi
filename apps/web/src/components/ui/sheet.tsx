"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetTitle = DialogPrimitive.Title;

const sheetVariants = cva("fixed inset-y-0 z-50 flex w-4/5 max-w-sm flex-col bg-bg", {
  variants: {
    side: {
      left: "left-0 border-r border-border",
      right: "right-0 border-l border-border",
    },
  },
  defaultVariants: { side: "right" },
});

type SheetContentProps = ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof sheetVariants>;

/** Side panel on a solid overlay (no blur). Focus is trapped by Radix. */
export function SheetContent({ className, children, side, ...props }: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-bg/80" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
