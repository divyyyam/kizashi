"use client";
import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { formatUsdc } from "@/lib/format";
import { BetSlip, type BetSlipProps } from "./BetSlip";
export function MobileBetSheet({ preview, ...props }: BetSlipProps & { preview: ReactNode }) {
  return (
    <Dialog.Root>
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t bg-bg p-4 lg:hidden">
        <span className="tabular text-small">
          {props.quote.status === "ready"
            ? formatUsdc(props.quote.data.chargeUsdc, { suffix: true })
            : copy.market.pending}
        </span>
        <Dialog.Trigger asChild>
          <Button>{copy.market.openSlip}</Button>
        </Dialog.Trigger>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-bg/80" />
        <Dialog.Content
          aria-describedby={undefined}
          className="ticket-sheet fixed inset-x-0 bottom-0 z-50 max-h-4/5 overflow-y-auto rounded-t-lg border-t bg-surface"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-surface px-4 py-3">
            <Dialog.Title className="font-display text-2xl">{copy.market.slip}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost">{copy.market.closeSlip}</Button>
            </Dialog.Close>
          </div>
          <BetSlip {...props} hideHeading preview={preview} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
