/**
 * Writes one Arkiv curveSnapshot per open market from on-chain pool state (indexer wallet), so the
 * crowd-history chart has real points. Run after trades; it skips a market whose newest snapshot is
 * under 60 s old.
 *
 *   cd apps/web && bun --env-file=../../.env scripts/arkiv-snapshots.ts [marketId ...]
 */
import {
  arkivConfigFromEnv,
  createArkivReader,
  createArkivWriter,
  curveHistory,
  explorerEntityUrl,
  publishCurveSnapshot,
} from "@kizashi/arkiv";
import {
  arcTestnet,
  factoryAddress,
  kizashiMarketFactoryAbi,
  kizashiPoolAbi,
} from "@kizashi/contracts";
import { createPublicClient, http, isHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const log = (value: unknown) => process.stdout.write(`${String(value)}\n`);
const ARC = 5042002;

async function main() {
  const rpc = process.env.ARC_TESTNET_RPC_URL;
  const key = process.env.INDEXER_ARKIV_PRIVATE_KEY;
  const cfg = arkivConfigFromEnv(process.env);
  if (!rpc || !key || !isHex(key) || cfg.status !== "ready")
    throw new Error(
      "ARC_TESTNET_RPC_URL, INDEXER_ARKIV_PRIVATE_KEY and ARKIV_RPC_URL are required",
    );
  const factory = factoryAddress(ARC);
  if (!factory) throw new Error("no factory");
  const arc = createPublicClient({ chain: arcTestnet, transport: http(rpc, { retryCount: 3 }) });
  const account = privateKeyToAccount(key);
  const reader = createArkivReader(cfg.config);
  const writer = createArkivWriter({ ...cfg.config, account, timeoutMs: 60_000 });

  const count = await arc.readContract({
    address: factory,
    abi: kizashiMarketFactoryAbi,
    functionName: "marketCount",
  });
  const ids = process.argv.slice(2).length
    ? process.argv.slice(2).map((v) => BigInt(v))
    : Array.from({ length: Number(count) }, (_, i) => BigInt(i + 1));

  for (const id of ids) {
    const pool = await arc.readContract({
      address: factory,
      abi: kizashiMarketFactoryAbi,
      functionName: "poolOf",
      args: [id],
    });
    const block = await arc.getBlock();
    const at = { blockNumber: block.number };
    const state = await arc.readContract({
      address: pool,
      abi: kizashiPoolAbi,
      functionName: "state",
      ...at,
    });
    if (state !== 1) {
      log(`#${id}: not open (state ${state}), skipped`);
      continue;
    }
    const [q, b, prices] = await Promise.all([
      arc.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "q", ...at }),
      arc.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "b", ...at }),
      arc.readContract({ address: pool, abi: kizashiPoolAbi, functionName: "prices", ...at }),
    ]);
    const history = await curveHistory(reader, id.toString(), {
      owner: account.address,
      arcChainId: ARC,
    });
    const newest = history.items.at(-1);
    if (newest && Number(block.timestamp) - newest.tsSec < 60) {
      log(`#${id}: snapshot under 60 s old, skipped`);
      continue;
    }
    const result = await publishCurveSnapshot(writer, {
      marketId: id.toString(),
      arcChainId: ARC,
      tsSec: Number(block.timestamp),
      block: block.number,
      payload: {
        bWad: b.toString(),
        qWad: q.map((v) => v.toString()),
        pricesWad: prices.map((v) => (v < 0n ? 0n : v).toString()),
      },
    });
    log(
      `#${id}: snapshot ${result.entityKey} tx ${result.txHash} ${explorerEntityUrl(result.entityKey)}`,
    );
  }
}

main().catch((error) => {
  log(error instanceof Error ? error.message : error);
  process.exit(1);
});
