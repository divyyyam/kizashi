import { describe, expect, test } from "bun:test";
import { isHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  ARKIV_TESTNET,
  arkivConfigFromEnv,
  createArkivReader,
  createArkivWriter,
  explorerEntityUrl,
  explorerTxUrl,
  probesByLabel,
  publishProbe,
} from "../src";

/**
 * Live write + query on the Arkiv testnet. Skipped unless ARKIV_RPC_URL (with access key) and
 * ARKIV_SMOKE_PRIVATE_KEY (a funded, throwaway wallet) are set. Prints evidence for the handoff.
 */
const key = process.env.ARKIV_SMOKE_PRIVATE_KEY;
const cfg = arkivConfigFromEnv(process.env);
const enabled = cfg.status === "ready" && key !== undefined && isHex(key);

describe.skipIf(!enabled)("arkiv testnet smoke", () => {
  test("write a probe, read it back by label, assert the owner", async () => {
    if (cfg.status !== "ready" || !key || !isHex(key)) throw new Error("unreachable");
    const account = privateKeyToAccount(key);
    const reader = createArkivReader(cfg.config);
    const writer = createArkivWriter({ ...cfg.config, account, timeoutMs: 60_000 });

    expect(await reader.getChainId()).toBe(ARKIV_TESTNET.chainId);

    const label = `smoke-${Date.now()}`;
    const { entityKey, txHash } = await publishProbe(writer, label, "ARK-01 smoke test");
    const rows = await probesByLabel(reader, label, account.address);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.$key).toBe(entityKey);
    expect(rows[0]?.$owner.toLowerCase()).toBe(account.address.toLowerCase());

    // biome-ignore lint/suspicious/noConsole: smoke test prints transaction evidence for the handoff
    console.log(
      JSON.stringify(
        {
          writer: account.address,
          label,
          entityKey,
          txHash,
          entity: explorerEntityUrl(entityKey),
          tx: explorerTxUrl(txHash),
        },
        null,
        2,
      ),
    );
  }, 120_000);
});
