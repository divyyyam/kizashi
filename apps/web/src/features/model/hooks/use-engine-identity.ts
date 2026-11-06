"use client";

import { nonceResponseSchema, verifyResponseSchema } from "@kizashi/schemas/engine";
import { useRef } from "react";
import { createSiweMessage } from "viem/siwe";
import { useAccount, useSignMessage } from "wagmi";
import type { z } from "zod";
import { workspaceCopy } from "@/content/model-workspace-copy";
import { env } from "@/lib/env";
import { engineRequest } from "../lib/engine-http";

export function useEngineIdentity() {
  const { address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const token = useRef<z.infer<typeof verifyResponseSchema> | null>(null);
  const identity = `${address ?? ""}:${chainId ?? ""}`;
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const ready = Boolean(address && chainId === env.NEXT_PUBLIC_CHAIN_ID);
  async function authenticate(signal: AbortSignal) {
    if (!address || !ready) throw new Error(address ? workspaceCopy.wrongChain : workspaceCopy.connect);
    const cached = token.current;
    if (cached && cached.address.toLowerCase() === address.toLowerCase() && cached.chainId === chainId && cached.expiresAtSec > Date.now() / 1000 + 60) return cached.token;
    const { nonce } = await engineRequest("/auth/nonce", nonceResponseSchema, { signal });
    signal.throwIfAborted();
    const message = createSiweMessage({ address, chainId: env.NEXT_PUBLIC_CHAIN_ID, domain: window.location.host, uri: window.location.origin, version: "1", nonce, issuedAt: new Date(), statement: workspaceCopy.signIn });
    const signature = await signMessageAsync({ message });
    signal.throwIfAborted();
    if (currentIdentity.current !== identity) throw new Error(workspaceCopy.unauthorized);
    const result = await engineRequest("/auth/verify", verifyResponseSchema, { signal, body: { v: 1, message, signature } });
    if (result.address.toLowerCase() !== address.toLowerCase() || result.chainId !== chainId) throw new Error(workspaceCopy.unauthorized);
    token.current = result;
    return result.token;
  }
  return { identity, ready, address, authenticate, forget: () => { token.current = null; } };
}
