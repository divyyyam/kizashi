/**
 * Every user-facing string in the web app, grouped by feature.
 * Marketing copy comes only from FINAL-UI-ELEMENTS; its open fields (tagline, landing §6.2)
 * are absent on purpose. Everything here is functional microcopy (ANTI-SLOP §3).
 */
export const copy = {
  site: {
    name: "Kizashi",
  },
  routes: {
    markets: "Markets",
    marketsNew: "Create market",
    market: "Market",
    portfolio: "Portfolio",
    model: "Model",
  },
  nav: {
    home: "Kizashi home",
    main: "Main",
    links: [
      { label: "Markets", href: "/markets" },
      { label: "Portfolio", href: "/portfolio" },
      { label: "Model", href: "/model" },
    ],
    openMenu: "Open navigation menu",
    closeMenu: "Close navigation menu",
  },
  connect: {
    button: "Connect wallet",
    walletGroup: "Wallets",
    notConnected: "Connect a wallet to see your balance.",
    accountMenu: "Account menu",
    balanceUnavailable: "Balance unavailable",
    connecting: "Connecting",
    wrongNetwork: "Switch to Arc",
    copyAddress: "Copy address",
    addressCopied: "Address copied",
    viewOnExplorer: "View on explorer",
    disconnect: "Disconnect",
  },
  footer: {
    githubLabel: "GitHub",
    githubUrl: "https://github.com/divyyyam/kizashi",
    legal: "© 2026 Kizashi · Arc testnet only",
  },
  empty: {
    markets: "No markets yet.",
    portfolio: "No positions yet.",
  },
  errors: {
    generic: "Something went wrong while loading this page.",
    retry: "Try again",
    notFound: "This page does not exist.",
    goHome: "Go to the home page",
    network: "Could not reach the network. Check your connection and try again.",
  },
  loading: {
    page: "Loading",
  },
  tx: {
    pending: "Transaction pending",
    success: "Transaction confirmed",
    failed: "Transaction failed",
    viewOnExplorer: "View on explorer",
  },
  unavailable: {
    contracts: "Live once contracts are deployed on Arc.",
    indexer: "Live once the indexer is running.",
    engine: "Live once the engine is connected.",
  },
} as const;
