import { errorResponseSchema } from "@kizashi/schemas/engine";
import { rateLimit } from "express-rate-limit";
import { authenticatedPrincipal } from "./require-auth";

export function perUserRateLimit(limit: number, windowMs: number) {
  return rateLimit({
    limit,
    windowMs,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (_request, response) => authenticatedPrincipal(response).sub,
    handler: (_request, response) => {
      response.status(429).json(
        errorResponseSchema.parse({
          v: 1,
          error: { code: "rate_limited", message: "Too many requests. Try again later." },
        }),
      );
    },
  });
}
