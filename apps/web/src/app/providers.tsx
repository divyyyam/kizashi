"use client";

import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { type State, WagmiProvider } from "wagmi";
import { createWagmiConfig } from "@/lib/wagmi";
import { walletConnectors } from "@/lib/wallet-connectors";
import "@rainbow-me/rainbowkit/styles.css";

// RainbowKit's modal reads these as CSS values, so the design tokens apply unchanged.
const walletTheme = {
  ...darkTheme({ borderRadius: "small", overlayBlur: "none" }),
  colors: {
    ...darkTheme().colors,
    accentColor: "var(--color-accent)",
    accentColorForeground: "var(--color-accent-fg)",
    modalBackground: "var(--color-surface-raised)",
    modalBorder: "var(--color-border)",
    modalText: "var(--color-text)",
    modalTextSecondary: "var(--color-text-muted)",
  },
  fonts: { body: "var(--font-sans)" },
  shadows: { ...darkTheme().shadows, dialog: "none", selectedWallet: "none" },
};

const wagmiConfig = createWagmiConfig(walletConnectors);

type ProvidersProps = {
  readonly initialState: State | undefined;
  readonly children: ReactNode;
};

export function Providers({ initialState, children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={walletTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
