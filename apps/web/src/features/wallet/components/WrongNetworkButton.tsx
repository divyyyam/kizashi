"use client";

import { TriangleAlert } from "lucide-react";
import { useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { appChain } from "@/lib/wagmi";

/** One click switches to the app chain; wagmi adds the chain to the wallet first if it is missing. */
export function WrongNetworkButton({ className }: { readonly className?: string }) {
  const { switchChain, isPending } = useSwitchChain();
  return (
    <Button
      variant="warning"
      className={className}
      disabled={isPending}
      onClick={() => switchChain({ chainId: appChain.id })}
    >
      <TriangleAlert aria-hidden className="size-4" strokeWidth={1.5} />
      {copy.connect.wrongNetwork}
    </Button>
  );
}
