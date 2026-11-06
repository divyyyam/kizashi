"use client";

import { Wallet } from "lucide-react";
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
    <section className="venue-state">
      <div className="venue-state-icon" aria-hidden>
        <Wallet />
      </div>
      <h2>{copy.portfolio.connect}</h2>
      <ConnectButton />
    </section>
  );
}
