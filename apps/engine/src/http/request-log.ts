import type { RequestHandler } from "express";
import type { Logger } from "pino";

export function requestLog(logger: Logger): RequestHandler {
  return (_request, response, next) => {
    const requestId = crypto.randomUUID();
    response.locals.requestId = requestId;
    response.setHeader("X-Request-Id", requestId);
    response.on("finish", () => {
      logger.info({ requestId, status: response.statusCode }, "Engine request completed");
    });
    next();
  };
}
