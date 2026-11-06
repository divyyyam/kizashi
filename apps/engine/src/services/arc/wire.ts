import type { Logger } from "pino";
import type { EngineEnvironment } from "../../env";
import { createProposalPublisher } from "../arkiv-proposals";
import { createArcAdapters } from "./adapters";
import { createArcClient, readDeployments } from "./client";

const REPO_ROOT = new URL("../../../../../", import.meta.url);

/** Builds the Suggest-mode adapters when Arc is configured; reports what is degraded. */
export function arcAdaptersFromEnv(settings: EngineEnvironment, logger: Logger) {
  const rpcUrl = settings.ARC_TESTNET_RPC_URL;
  if (!rpcUrl) {
    logger.warn({ code: "vault_unavailable" }, "ARC_TESTNET_RPC_URL is not set; ticks are off");
    return undefined;
  }
  const chainId = settings.NEXT_PUBLIC_CHAIN_ID;
  const arkiv = createProposalPublisher(settings, logger);
  if (arkiv.status.status === "ready")
    logger.info({ arkivWriter: arkiv.status.writer }, "Arkiv proposal writer ready");
  else
    logger.warn(
      { code: "arkiv_unavailable", reason: arkiv.status.reason },
      "Arkiv proposals disabled; proposals are served over the engine API only",
    );
  return createArcAdapters(
    { client: createArcClient(rpcUrl), deployments: readDeployments(chainId, REPO_ROOT), chainId },
    arkiv.publisher,
  );
}
