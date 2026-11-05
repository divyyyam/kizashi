import { MemorySaver } from "@langchain/langgraph";
import pino from "pino";
import { createApp } from "../../src/app";
import { createNoopGraph } from "../../src/graph/build";
import type { MarketKindService } from "../../src/graph/marketKind";
import { createAuthService } from "../../src/services/auth";
import type { RulesRuns } from "../../src/services/rules-runs";
import type { parseRulesUpload } from "../../src/services/rules-upload";
import type { RunControl } from "../../src/services/run-control";
import type { RunEvents } from "../../src/services/run-events";
import { createRunService } from "../../src/services/runs";
import type { TickCoordinator } from "../../src/services/tick-coordinator";
import { createTokenService } from "../../src/services/tokens";
import { memoryNonceStore } from "./auth-store";
import { memoryRunStore } from "./run-store";

export const TEST_CHAIN_ID = 31337;
export const TEST_WEB_ORIGIN = "http://localhost:3000";
const REQUEST_TIMEOUT_MS = 3000;

export async function startTestServer(
  options: {
    rules?: RulesRuns;
    control?: RunControl;
    events?: RunEvents;
    ticks?: TickCoordinator;
    extractPdf?: Parameters<typeof parseRulesUpload>[0]["extractPdf"];
    suggestMarketKind?: MarketKindService;
  } = {},
) {
  const tokens = createTokenService(crypto.randomUUID() + crypto.randomUUID());
  const auth = createAuthService({
    nonces: memoryNonceStore(),
    tokens,
    domain: "localhost:3000",
    origins: [TEST_WEB_ORIGIN],
    chainId: TEST_CHAIN_ID,
  });
  const runs = createRunService({
    store: memoryRunStore(),
    graph: createNoopGraph(new MemorySaver()),
  });
  const app = createApp({
    auth,
    tokens,
    runs,
    origins: [TEST_WEB_ORIGIN],
    chainId: TEST_CHAIN_ID,
    version: "0.1.0",
    logger: pino({ level: "silent" }),
    ...options,
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test listener has no TCP port.");
  return {
    tokens,
    runs,
    request(path: string, options: RequestInit = {}) {
      return fetch(`http://127.0.0.1:${address.port}${path}`, {
        ...options,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  };
}
