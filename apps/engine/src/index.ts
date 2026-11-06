import pino from "pino";
import { readEnvironment } from "./env";
import { arcAdaptersFromEnv } from "./services/arc/wire";
import { createRuntime } from "./services/runtime";

const logger = pino({
  redact: {
    paths: [
      "*.privateKey",
      "*.signature",
      "*.token",
      "*.authorization",
      "req.headers.authorization",
    ],
    censor: "[redacted]",
  },
});

try {
  const settings = readEnvironment();
  const runtime = await createRuntime(settings, logger, arcAdaptersFromEnv(settings, logger));
  const server = runtime.app.listen(settings.PORT, () => {
    logger.info({ port: settings.PORT }, "Engine listening");
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  let closing = false;
  const close = () => {
    if (closing) return;
    closing = true;
    server.close(() => {
      void runtime.close().catch(() => {
        logger.error({ code: "shutdown_failed" }, "Engine shutdown failed");
        process.exitCode = 1;
      });
    });
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
} catch {
  logger.fatal(
    { code: "startup_failed" },
    "Engine startup failed; check required environment and development database schemas",
  );
  process.exitCode = 1;
}
