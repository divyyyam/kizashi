"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Fingerprint, KeyRound, X } from "lucide-react";
import { BaseError, ResourceUnavailableRpcError, UserRejectedRequestError } from "viem";
import type { useConnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { formatAddress } from "@/lib/format";
import { appChain } from "@/lib/wagmi";
import { WalletChoices } from "./WalletChoices";
import { WalletPlate } from "./WalletPlate";

const words = copy.connect;
function errorCopy(error: Error) {
  if (
    error instanceof BaseError &&
    error.walk((cause) => cause instanceof UserRejectedRequestError)
  )
    return { title: words.cancelled, detail: words.cancelledHelp };
  const pending =
    error instanceof BaseError &&
    error.walk((cause) => cause instanceof ResourceUnavailableRpcError);
  return { title: words.failed, detail: pending ? words.pendingElsewhere : words.failedHelp };
}

function describeConnection(connection: ReturnType<typeof useConnect>) {
  const picked = connection.variables?.connector;
  const name = picked && "name" in picked ? picked.name : words.walletGroup;
  if (connection.isError) return errorCopy(connection.error);
  if (connection.isPending) return { title: words.confirm, detail: words.confirmHelp(name) };
  if (connection.isSuccess) {
    const account = connection.data.accounts[0];
    const address = typeof account === "string" ? account : account.address;
    return { title: words.connected, detail: formatAddress(address) };
  }
  return { title: words.button, detail: words.choose };
}

type Props = {
  open: boolean;
  connection: ReturnType<typeof useConnect>;
  setOpen: (open: boolean) => void;
  onMore: (() => void) | undefined;
  onClosed: (event: Event) => void;
};

// Keep the mutation outside the portal. Dismissing the dialog cannot cancel a wallet prompt.
export function WalletPicker({ open, setOpen, connection, onMore, onClosed }: Props) {
  const { variables, isPending, isSuccess, isError, reset } = connection;
  const { title, detail } = describeConnection(connection);
  const close = () => setOpen(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="wallet-overlay" />
        <Dialog.Content
          className="wallet-dialog"
          data-phase={connection.status}
          onCloseAutoFocus={onClosed}
        >
          <WalletPlate />
          <div className="wallet-body">
            <Dialog.Close className="wallet-close" aria-label={words.close}>
              <X size={18} />
            </Dialog.Close>
            <div className="wallet-step">
              <div aria-live="polite" aria-atomic="true">
                <Dialog.Title className="wallet-title">{title}</Dialog.Title>
                <Dialog.Description className="wallet-description">{detail}</Dialog.Description>
              </div>
              {connection.isIdle && (
                <WalletChoices
                  onMore={onMore}
                  onSelect={(connector) => connection.connect({ connector, chainId: appChain.id })}
                />
              )}
              {isPending && <Fingerprint size={36} className="wallet-fingerprint" aria-hidden />}
              {isSuccess && (
                <Button onClick={close}>
                  <Check size={16} />
                  {words.done}
                </Button>
              )}
              {isError && (
                <div className="wallet-recovery">
                  {variables && (
                    <Button onClick={() => connection.connect(variables)}>
                      {copy.errors.retry}
                    </Button>
                  )}
                  <Button variant="ghost" onClick={reset}>
                    {words.another}
                  </Button>
                </div>
              )}
            </div>
            <div className="wallet-disclosure">
              <KeyRound size={14} aria-hidden />
              {words.access}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
