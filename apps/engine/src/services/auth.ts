import type { VerifyRequest } from "@kizashi/schemas/engine";
import { getAddress, type Hex, recoverMessageAddress } from "viem";
import { generateSiweNonce, parseSiweMessage, validateSiweMessage } from "viem/siwe";
import { EngineServiceError } from "../errors";
import type { NonceStore } from "./storage";
import { JWT_LIFETIME_SEC, type TokenService } from "./tokens";

const NONCE_LIFETIME_SEC = 5 * 60;
const MILLISECONDS_PER_SECOND = 1000;
type AuthOptions = {
  nonces: NonceStore;
  tokens: TokenService;
  domain: string;
  origins: readonly string[];
  chainId: number;
  now?: () => Date;
};

function unauthorized(): never {
  throw new EngineServiceError("unauthorized", "The sign-in message is invalid or expired.", 401);
}

async function verifyMessage(request: VerifyRequest, options: AuthOptions, now: Date) {
  try {
    const parsed = parseSiweMessage(request.message);
    if (!parsed.nonce || !parsed.address || !parsed.uri || !parsed.issuedAt) unauthorized();
    const stored = await options.nonces.find(parsed.nonce);
    if (!stored || stored.expiresAt <= now || parsed.issuedAt > now) unauthorized();
    const uri = new URL(parsed.uri);
    if (uri.href !== `${uri.origin}/` && uri.href !== uri.origin) unauthorized();
    if (!options.origins.includes(uri.origin) || uri.host !== options.domain) unauthorized();
    if (parsed.chainId !== options.chainId || parsed.version !== "1") unauthorized();
    if (
      !validateSiweMessage({
        message: parsed,
        domain: options.domain,
        nonce: stored.nonce,
        time: now,
      })
    ) {
      unauthorized();
    }
    const recovered = await recoverMessageAddress({
      message: request.message,
      signature: request.signature as Hex,
    });
    const address = getAddress(parsed.address);
    if (recovered !== address) unauthorized();
    if (!(await options.nonces.consume(stored.nonce, now))) unauthorized();
    return address;
  } catch (error) {
    if (error instanceof EngineServiceError) throw error;
    unauthorized();
  }
}

export function createAuthService(options: AuthOptions) {
  const now = options.now ?? (() => new Date());
  return {
    async nonce() {
      const nonce = generateSiweNonce();
      const expiresAtSec =
        Math.floor(now().getTime() / MILLISECONDS_PER_SECOND) + NONCE_LIFETIME_SEC;
      await options.nonces.create(nonce, new Date(expiresAtSec * MILLISECONDS_PER_SECOND));
      return { v: 1 as const, nonce, expiresAtSec };
    },
    async verify(request: VerifyRequest) {
      const time = now();
      const address = await verifyMessage(request, options, time);
      const nowSec = Math.floor(time.getTime() / MILLISECONDS_PER_SECOND);
      const token = await options.tokens.issue({ sub: address, chainId: options.chainId }, nowSec);
      return {
        v: 1 as const,
        token,
        address,
        chainId: options.chainId,
        expiresAtSec: nowSec + JWT_LIFETIME_SEC,
      };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
