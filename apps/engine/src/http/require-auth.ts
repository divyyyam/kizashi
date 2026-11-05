import { type Principal, principalSchema } from "@kizashi/schemas/engine";
import type { RequestHandler, Response } from "express";
import { EngineServiceError } from "../errors";
import type { TokenService } from "../services/tokens";

export function requireAuth(tokens: TokenService, chainId: number): RequestHandler {
  return async (request, response, next) => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new EngineServiceError("unauthorized", "Sign in to access the engine.", 401);
    }
    const principal = await tokens.verify(header.slice("Bearer ".length));
    if (principal.chainId !== chainId) {
      throw new EngineServiceError("unauthorized", "Sign in on the configured engine chain.", 401);
    }
    response.locals.principal = principal;
    next();
  };
}

export function authenticatedPrincipal(response: Response): Principal {
  return principalSchema.parse(response.locals.principal);
}
