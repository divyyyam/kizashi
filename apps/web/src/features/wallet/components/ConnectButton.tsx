"use client";

import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowUpRight, Wallet } from "lucide-react";
import { getAddress } from "viem";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { AccountMenu } from "./AccountMenu";
import { useOpenWalletPicker } from "./WalletPickerProvider";
import { WrongNetworkButton } from "./WrongNetworkButton";

// Compact on phones, with a reserved label width on the desktop toolbar.
const SLOT = "w-auto max-w-full md:min-w-40";

type ConnectButtonProps = {
  readonly className?: string;
};

/** Wallet entry point with the states of UI-guide §8: not mounted, disconnected, wrong network, connected. */
export function ConnectButton({ className }: ConnectButtonProps) {
  const show = useOpenWalletPicker();
  return (
    <RainbowConnectButton.Custom>
      {({ account, chain, mounted }) => {
        const slot = cn(SLOT, className);
        if (!mounted) {
          return (
            <Button className={slot} disabled aria-hidden tabIndex={-1}>
              <Wallet size={16} />
              {copy.connect.button}
            </Button>
          );
        }
        if (account === undefined || chain === undefined) {
          return (
            <Button
              className={cn(slot, "wallet-trigger")}
              aria-haspopup="dialog"
              data-wallet-control
              onClick={(event) => show(event.currentTarget)}
            >
              <Wallet size={16} aria-hidden />
              {copy.connect.button}
              <ArrowUpRight className="hidden sm:block" size={15} aria-hidden />
            </Button>
          );
        }
        if (chain.unsupported === true) {
          return <WrongNetworkButton className={slot} />;
        }
        return <AccountMenu address={getAddress(account.address)} className={slot} />;
      }}
    </RainbowConnectButton.Custom>
  );
}
