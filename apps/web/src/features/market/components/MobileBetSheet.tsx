"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { formatUsdc } from "@/lib/format";
import { BetSlip, type BetSlipProps } from "./BetSlip";
export function MobileBetSheet(props: BetSlipProps) {
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
          className="ticket-sheet fixed inset-x-0 bottom-0 z-50 max-h-4/5 overflow-y-auto rounded-t-lg border-t bg-bg p-4"
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <Dialog.Title className="text-h3">{copy.market.slip}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost">{copy.market.closeSlip}</Button>
            </Dialog.Close>
          </div>
          <BetSlip {...props} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
