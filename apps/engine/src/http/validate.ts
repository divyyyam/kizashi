import type { Request, RequestHandler, Response } from "express";
import type { z } from "zod";
import { EngineServiceError } from "../errors";

type ControllerContext<T> = { input: T; request: Request; response: Response };

export function validate<Schema extends z.ZodType>(
  schema: Schema,
  controller: (context: ControllerContext<z.output<Schema>>) => void | Promise<void>,
): RequestHandler {
  return async (request, response) => {
    const result = schema.safeParse({
      body: request.body,
      query: request.query,
      params: request.params,
    });
    if (!result.success) {
      throw new EngineServiceError(
        "bad_request",
        "The request does not match the engine API.",
        400,
      );
    }
    await controller({ input: result.data, request, response });
  };
}
