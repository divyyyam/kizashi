import { z } from "zod";
import { addressSchema, apiVersionSchema, emptyRequestSchema, unixSecondsSchema } from "./common";

export const nonceResponseSchema = z
  .object({
    v: apiVersionSchema,
    nonce: z.string().regex(/^[a-zA-Z0-9]{8,}$/),
    expiresAtSec: unixSecondsSchema,
  })
  .strict();
export const verifyRequestSchema = z
  .object({
    v: apiVersionSchema,
    message: z.string().min(1).max(8192),
    signature: z.string().regex(/^0x[\da-fA-F]{130}$/),
  })
  .strict();
export const verifyResponseSchema = z
  .object({
    v: apiVersionSchema,
    token: z.string().min(1),
    address: addressSchema,
    chainId: z.number().int().positive(),
    expiresAtSec: unixSecondsSchema,
  })
  .strict();
export const principalSchema = z
  .object({
    sub: addressSchema,
    chainId: z.number().int().positive(),
  })
  .strict();
export type VerifyRequest = z.infer<typeof verifyRequestSchema>;
export type Principal = z.infer<typeof principalSchema>;
export const verifyEndpointRequestSchema = z
  .object({
    body: verifyRequestSchema,
    query: emptyRequestSchema,
    params: emptyRequestSchema,
  })
  .strict();
