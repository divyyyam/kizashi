"use client";

import { ChevronDown, Copy, ExternalLink, LogOut } from "lucide-react";
import { toast } from "sonner";
import type { Address } from "viem";
import { useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { addressUrl } from "@/lib/explorer";
import { formatAddress, formatUsdc } from "@/lib/format";
import { appChain } from "@/lib/wagmi";
import { useUsdcBalance } from "../hooks/use-usdc-balance";

type AccountMenuProps = {
  readonly address: Address;
  readonly className?: string;
};

const ICON = { "aria-hidden": true, className: "size-4", strokeWidth: 1.5 } as const;

/** Connected state: short address and USDC balance; the menu copies, opens the explorer, disconnects. */
export function AccountMenu({ address, className }: AccountMenuProps) {
  const { disconnect } = useDisconnect();
  const balance = useUsdcBalance(address);
  const explorer = addressUrl(appChain.id, address);

  const copyAddress = () => {
    navigator.clipboard.writeText(address).then(
      () => toast.success(copy.connect.addressCopied),
      () => toast.error(copy.errors.generic),
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-wallet-control
          variant="secondary"
          className={cn(
            "group gap-2.5 data-[state=open]:border-border-strong data-[state=open]:bg-surface-raised",
            className,
          )}
          aria-label={copy.connect.accountMenu}
        >
          <span className="tabular text-text" title={address}>
            {formatAddress(address)}
          </span>
          {balance.status === "ready" ? (
            <span className="tabular text-text-muted">{formatUsdc(balance.data)}</span>
          ) : null}
          <ChevronDown
            aria-hidden
            strokeWidth={1.5}
            className="size-3.5 text-text-muted transition-transform duration-150 group-data-[state=open]:rotate-180"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="tabular break-all text-text">{address}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={copyAddress}>
          <Copy {...ICON} />
          {copy.connect.copyAddress}
        </DropdownMenuItem>
        {explorer === undefined ? null : (
          <DropdownMenuItem asChild>
            <a href={explorer} target="_blank" rel="noopener noreferrer">
              <ExternalLink {...ICON} />
              {copy.connect.viewOnExplorer}
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => disconnect()}>
          <LogOut {...ICON} />
          {copy.connect.disconnect}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
