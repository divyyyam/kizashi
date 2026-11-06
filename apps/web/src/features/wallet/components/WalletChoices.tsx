import { ArrowRight, ArrowUpRight, QrCode, Wallet } from "lucide-react";
import Image from "next/image";
import type { Connector } from "wagmi";
import { copy } from "@/content/copy";
import { useBrowserWallets } from "../hooks/use-browser-wallets";

type Props = {
  readonly onSelect: (connector: Connector) => void;
  readonly onMore: (() => void) | undefined;
};

export function WalletChoices({ onSelect, onMore }: Props) {
  const wallets = useBrowserWallets();
  return (
    <div className="wallet-options">
      {wallets === undefined && <p role="status">{copy.connect.checking}</p>}
      {wallets?.map((wallet) => (
        <button
          className="wallet-option"
          key={wallet.uid}
          type="button"
          onClick={() => onSelect(wallet)}
        >
          <span className="wallet-option-icon">
            {wallet.icon?.startsWith("data:image/") ? (
              <Image src={wallet.icon} width={26} height={26} unoptimized alt="" />
            ) : (
              <Wallet size={22} />
            )}
          </span>
          <span>
            <strong>{wallet.name}</strong>
            <small>{copy.connect.detected}</small>
          </span>
          <ArrowRight className="wallet-option-arrow" size={17} aria-hidden />
        </button>
      ))}
      {onMore && (
        <button type="button" className="wallet-option" onClick={onMore}>
          <span className="wallet-option-icon">
            <QrCode size={22} />
          </span>
          <span>
            <strong>{copy.connect.mobileWallets}</strong>
            <small>{copy.connect.mobileHelp}</small>
          </span>
          <ArrowRight className="wallet-option-arrow" size={17} aria-hidden />
        </button>
      )}
      {wallets?.length === 0 && (
        <div className="wallet-install">
          <p className="font-medium">{copy.connect.noBrowser}</p>
          <p className="text-small text-text-muted">{copy.connect.browserHelp}</p>
          <a href="https://metamask.io/download" target="_blank" rel="noopener noreferrer">
            {copy.connect.getWallet}
            <ArrowUpRight size={15} aria-hidden />
          </a>
        </div>
      )}
    </div>
  );
}
