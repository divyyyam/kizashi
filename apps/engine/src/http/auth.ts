import {
  emptyEndpointRequestSchema,
  nonceResponseSchema,
  verifyEndpointRequestSchema,
  verifyResponseSchema,
} from "@kizashi/schemas/engine";
import { Router } from "express";
import type { AuthService } from "../services/auth";
import { validate } from "./validate";

export function authRouter(auth: AuthService) {
  const router = Router();
  router.get(
    "/nonce",
    validate(emptyEndpointRequestSchema, async ({ response }) => {
      response.json(nonceResponseSchema.parse(await auth.nonce()));
    }),
  );
  router.post(
    "/verify",
    validate(verifyEndpointRequestSchema, async ({ input, response }) => {
      response.json(verifyResponseSchema.parse(await auth.verify(input.body)));
    }),
  );
  return router;
}
