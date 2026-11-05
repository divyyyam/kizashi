import { type Principal, principalSchema } from "@kizashi/schemas/engine";
import { jwtVerify, SignJWT } from "jose";
import { EngineServiceError } from "../errors";

export const JWT_LIFETIME_SEC = 12 * 60 * 60;

export function createTokenService(secret: string) {
  const key = new TextEncoder().encode(secret);
  return {
    async issue(principal: Principal, nowSec: number) {
      return new SignJWT({ chainId: principal.chainId })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setSubject(principal.sub)
        .setIssuedAt(nowSec)
        .setExpirationTime(nowSec + JWT_LIFETIME_SEC)
        .sign(key);
    },
    async verify(token: string): Promise<Principal> {
      try {
        const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
        return principalSchema.parse({ sub: payload.sub, chainId: payload.chainId });
      } catch {
        throw new EngineServiceError("unauthorized", "Sign in to access the engine.", 401);
      }
    },
  };
}

export type TokenService = ReturnType<typeof createTokenService>;
