"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { createContext, type ReactNode, useContext, useRef, useState } from "react";
import { useConnect } from "wagmi";
import { env } from "@/lib/env";
import { WalletPicker } from "./WalletPicker";
import "./wallet-picker.css";

const Opener = createContext<((trigger: HTMLButtonElement) => void) | null>(null);
export function useOpenWalletPicker() {
  const open = useContext(Opener);
  if (!open) throw new Error("ConnectButton requires WalletPickerProvider");
  return open;
}

export function WalletPickerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const handoff = useRef(false);
  const connection = useConnect();
  const { openConnectModal } = useConnectModal();
  const show = (button: HTMLButtonElement) => {
    trigger.current = button;
    if (!connection.isPending) connection.reset();
    setOpen(true);
  };
  const more = () => {
    handoff.current = true;
    setOpen(false);
  };
  const onClosed = (event: Event) => {
    event.preventDefault();
    const focus = trigger.current?.isConnected
      ? trigger.current
      : document.querySelector<HTMLElement>("[data-wallet-control]");
    focus?.focus({ preventScroll: true });
    if (handoff.current) {
      handoff.current = false;
      openConnectModal?.();
    }
  };
  return (
    <Opener.Provider value={show}>
      {children}
      <WalletPicker
        open={open}
        setOpen={setOpen}
        connection={connection}
        onClosed={onClosed}
        onMore={env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID && openConnectModal ? more : undefined}
      />
    </Opener.Provider>
  );
}
