"use client";

import { connectorsForWallets, type WalletList } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { copy } from "@/content/copy";
import { env } from "@/lib/env";

const projectId = env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// WalletConnect-based wallets need a project ID; without one only the browser wallet is offered.
const wallets: WalletList = [
  {
    groupName: copy.connect.walletGroup,
    wallets:
      projectId === undefined
        ? [injectedWallet]
        : [metaMaskWallet, rainbowWallet, walletConnectWallet, injectedWallet],
  },
];

export const walletConnectors = connectorsForWallets(wallets, {
  appName: copy.site.name,
  // Only WalletConnect wallets read this, and they are excluded above when it is missing.
  projectId: projectId ?? "",
});
