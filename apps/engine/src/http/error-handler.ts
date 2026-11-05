import { errorResponseSchema } from "@kizashi/schemas/engine";
import type { ErrorRequestHandler } from "express";
import multer from "multer";
import type { Logger } from "pino";
import { EngineServiceError } from "../errors";

function classifyError(error: unknown): EngineServiceError {
  if (error instanceof EngineServiceError) return error;
  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === "LIMIT_FILE_SIZE" || error.code === "LIMIT_FIELD_VALUE";
    return new EngineServiceError(
      tooLarge ? "upload_too_large" : "bad_request",
      tooLarge ? "The upload exceeds the allowed size." : "The multipart upload is invalid.",
      tooLarge ? 413 : 400,
    );
  }
  if (error instanceof Error && "type" in error && error.type === "entity.too.large") {
    return new EngineServiceError(
      "upload_too_large",
      "The request body exceeds the allowed size.",
      413,
    );
  }
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    return new EngineServiceError("bad_request", "The request body must be valid JSON.", 400);
  }
  return new EngineServiceError("internal", "The engine could not complete the request.", 500);
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, _request, response, _next) => {
    const { status, code, message } = classifyError(error);
    if (status >= 500)
      logger.error({ requestId: response.locals.requestId, code }, "Engine request failed");
    response.status(status).json(errorResponseSchema.parse({ v: 1, error: { code, message } }));
  };
}
