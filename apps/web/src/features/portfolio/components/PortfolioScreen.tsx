"use client";

import { MarketsLink } from "@/components/feedback/MarketsLink";
import { StatePanel } from "@/components/feedback/StatePanel";
import { copy } from "@/content/copy";
import { ConnectButton } from "@/features/wallet";
import { usePortfolio } from "../hooks/use-portfolio";
import { usePortfolioAccount } from "../hooks/use-portfolio-account";
import { PortfolioView } from "./PortfolioView";

export function PortfolioScreen() {
  const account = usePortfolioAccount();
  const result = usePortfolio(account.owner);

  return account.connected ? (
    <PortfolioView result={result} />
  ) : (
    <StatePanel
      kind="unavailable"
      title={copy.feedback.portfolioConnect}
      message={copy.feedback.portfolioConnectHelp}
    >
      <ConnectButton />
      <MarketsLink />
    </StatePanel>
  );
}
