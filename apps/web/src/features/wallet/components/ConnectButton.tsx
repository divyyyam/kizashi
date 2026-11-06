"use client";

import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { getAddress } from "viem";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { AccountMenu } from "./AccountMenu";
import { WrongNetworkButton } from "./WrongNetworkButton";

// Fixed width of the widest state (address + balance) so connecting never shifts the navbar.
const SLOT = "w-60";

type ConnectButtonProps = {
  readonly className?: string;
};

/** Wallet entry point with the states of UI-guide §8: not mounted, disconnected, wrong network, connected. */
export function ConnectButton({ className }: ConnectButtonProps) {
  return (
    <RainbowConnectButton.Custom>
      {({ account, chain, mounted, openConnectModal, connectModalOpen }) => {
        const slot = cn(SLOT, className);
        if (!mounted) {
          return <Button className={slot} disabled aria-hidden tabIndex={-1} />;
        }
        if (account === undefined || chain === undefined) {
          return (
            <Button className={slot} onClick={openConnectModal} disabled={connectModalOpen}>
              {connectModalOpen ? copy.connect.connecting : copy.connect.button}
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
