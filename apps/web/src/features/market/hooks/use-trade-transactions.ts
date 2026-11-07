"use client";

import { erc20Abi, kizashiPoolAbi, usdcAddressByChainId } from "@kizashi/contracts";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { type Dispatch, type RefObject, type SetStateAction, useRef, useState } from "react";
import { toast } from "sonner";
import { type Address, type Hash, maxUint256, type PublicClient, type WalletClient } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";
import { copy } from "@/content/copy";
import { txUrl } from "@/lib/explorer";

type Identity = { chainId: number; poolAddress?: Address | undefined; owner?: Address | undefined };
type Context = Identity & {
  client: PublicClient | undefined;
  wallet: WalletClient | undefined;
  queries: QueryClient;
  busy: RefObject<boolean>;
  setApproving: Dispatch<SetStateAction<boolean>>;
  setTrading: Dispatch<SetStateAction<boolean>>;
};
const RECEIPT_TIMEOUT_MS = 60_000;

export function useTradeTransactions(identity: Identity) {
  const client = usePublicClient({ chainId: identity.chainId });
  const { data: wallet } = useWalletClient({ chainId: identity.chainId });
  const queries = useQueryClient();
  const busy = useRef(false);
  const [isApproving, setApproving] = useState(false);
  const [isTrading, setTrading] = useState(false);
  const context = { ...identity, client, wallet, queries, busy, setApproving, setTrading };
  return {
    available: Boolean(client && wallet),
    isApproving,
    isTrading,
    approve: () => approve(context),
    trade: (delta: readonly bigint[], limitUsdc: bigint, deadline?: bigint) =>
      trade(context, { delta, limitUsdc, deadline }),
  };
}

async function approve(context: Context) {
  const { client, wallet, owner, poolAddress, chainId, busy, setApproving, queries } = context;
  const usdc = usdcAddressByChainId(chainId);
  if (!client || !wallet || !owner || !poolAddress || !usdc || busy.current) return;
  busy.current = true;
  setApproving(true);
  let hash: Hash | undefined;
  try {
    const { request } = await client.simulateContract({
      address: usdc,
      abi: erc20Abi,
      functionName: "approve",
      args: [poolAddress, maxUint256],
      account: owner,
    });
    hash = await wallet.writeContract(request);
    const receipt = await client.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS });
    if (receipt.status !== "success") throw new Error("approval reverted");
    await queries.invalidateQueries({ queryKey: ["allowance", chainId, usdc, owner, poolAddress] });
    toast(copy.tx.success, transactionLink(chainId, hash));
  } catch {
    toast(copy.tx.failed, hash ? transactionLink(chainId, hash) : undefined);
  } finally {
    busy.current = false;
    setApproving(false);
  }
}

async function trade(
  context: Context,
  input: { delta: readonly bigint[]; limitUsdc: bigint; deadline: bigint | undefined },
) {
  const { client, wallet, owner, poolAddress, chainId, busy, setTrading, queries } = context;
  if (!client || !wallet || !owner || !poolAddress || busy.current) return;
  busy.current = true;
  setTrading(true);
  let hash: Hash | undefined;
  try {
    const deadline = input.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 1200);
    const { request } = await client.simulateContract({
      address: poolAddress,
      abi: kizashiPoolAbi,
      functionName: "trade",
      args: [[...input.delta], input.limitUsdc, deadline],
      account: owner,
    });
    hash = await wallet.writeContract(request);
    const receipt = await client.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS });
    if (receipt.status !== "success") throw new Error("trade reverted");
    toast(copy.market.betPlaced, transactionLink(chainId, hash));
    await queries.invalidateQueries();
  } catch {
    toast(copy.market.tradeFailed, hash ? transactionLink(chainId, hash) : undefined);
  } finally {
    busy.current = false;
    setTrading(false);
  }
}

function transactionLink(chainId: number, hash: Hash) {
  return {
    action: {
      label: copy.tx.viewOnExplorer,
      onClick: () => {
        const url = txUrl(chainId, hash);
        if (url) window.open(url, "_blank");
      },
    },
  };
}
