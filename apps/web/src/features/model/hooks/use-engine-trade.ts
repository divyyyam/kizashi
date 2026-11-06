"use client";

import { useEffect, useRef, useState } from "react";
import { type Hex, UserRejectedRequestError } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { workspaceCopy } from "@/content/model-workspace-copy";
import { env } from "@/lib/env";
import {
  type Approval,
  confirmEngineTransaction,
  signEngineTrade,
  type TransactionRequest,
} from "../lib/engine-trade";

export function useEngineTrade(tradeId: string) {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: env.NEXT_PUBLIC_CHAIN_ID });
  const { data: walletClient } = useWalletClient();
  const [busy, setBusy] = useState(false);
  const [hash, setHash] = useState<Hex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const key = `kizashi:engine-tx:${chainId}:${address}:${tradeId}`;
  const identity = useRef(key);
  identity.current = key;
  useEffect(() => {
    setHash(null);
    setError(null);
    try {
      const stored = localStorage.getItem(key);
      if (stored && /^0x[\da-f]{64}$/i.test(stored)) setHash(stored as Hex);
    } catch {
      setError(workspaceCopy.receiptStorage);
    }
  }, [key]);
  async function sign(
    approval: Approval,
    transaction: TransactionRequest,
    onReceipt: (hash: Hex) => Promise<void>,
  ) {
    if (
      lock.current ||
      !address ||
      chainId !== env.NEXT_PUBLIC_CHAIN_ID ||
      !publicClient ||
      !walletClient
    )
      return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = hash
        ? await confirmEngineTransaction(publicClient, hash)
        : await signEngineTrade({
            publicClient,
            walletClient,
            account: address,
            chainId,
            approval,
            transaction,
            onHash: (value) => {
              if (identity.current === key) setHash(value);
              try {
                localStorage.setItem(key, value);
              } catch {
                setError(workspaceCopy.receiptStorage);
              }
            },
          });
      if (identity.current === key) await onReceipt(result);
    } catch (failure) {
      if (identity.current === key)
        setError(
          failure instanceof UserRejectedRequestError
            ? workspaceCopy.signatureCancelled
            : workspaceCopy.transactionError,
        );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    busy,
    hash,
    error,
    sign,
    ready: Boolean(address && chainId === env.NEXT_PUBLIC_CHAIN_ID && publicClient && walletClient),
  };
}
