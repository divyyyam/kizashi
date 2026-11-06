// Live adapter verification on Arc testnet + Arkiv. Runs the engine's real Suggest-mode
// adapters (context, compile, risk, Arkiv proposal, receipt check, approval patch) for ONE
// operator-specified candidate. It does NOT run the LLM planner; that step needs
// GOOGLE_GENERATIVE_AI_API_KEY. The trader key is read from a file outside the repo.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import type { RuleSet } from "@kizashi/schemas/engine";
import pino from "pino";
import { createWalletClient, type Hex, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readEnvironment } from "../src/env";
import type { EngineState } from "../src/graph/state";
import { createArcClient, readDeployments } from "../src/services/arc/client";
import { compileCandidate } from "../src/services/arc/compile";
import { confirmOnArc } from "../src/services/arc/confirm";
import { createContextLoader } from "../src/services/arc/context";
import { createProposalPublisher } from "../src/services/arkiv-proposals";
import { evaluateTrade } from "../src/services/risk";
import { rulesHash } from "../src/services/rules-hash";

const print = (...parts: unknown[]) => process.stdout.write(`${parts.map(String).join(" ")}\n`);
const [marketId, keyFile, spendUsdc = "200000"] = process.argv.slice(2);
if (!marketId || !keyFile)
  throw new Error("usage: live-arc.ts <marketId> <traderKeyFile> [spendUsdc]");
const settings = readEnvironment();
const rpcUrl = settings.ARC_TESTNET_RPC_URL;
if (!rpcUrl) throw new Error("ARC_TESTNET_RPC_URL is required.");
const logger = pino({ level: "info" });
const chainId = settings.NEXT_PUBLIC_CHAIN_ID;
const deployments = readDeployments(chainId, new URL("../../../", import.meta.url));
const arc = { client: createArcClient(rpcUrl), deployments, chainId };
const account = privateKeyToAccount(readFileSync(keyFile, "utf8").trim() as Hex);
const now = Math.floor(Date.now() / 1000);
const rules: RuleSet = {
  budgetUsdc: "1000000",
  perTradeCapUsdc: "500000",
  dailyCapUsdc: "1000000",
  maxLossPerMarketUsdc: "1000000",
  maxDrawdownUsdc: "1000000",
  stopAtSec: now + 3600,
  allowedMarketIds: [marketId],
  allowedShapes: ["binary", "curve", "range"],
  notes: "adapter verification",
};
const candidate = {
  marketId,
  shape: { kind: "curve" as const, mean: "146", width: "4", precision: 0 },
  spendUsdc,
  rationale: "Operator-specified adapter verification candidate (planner not run).",
  ruleRefs: [],
};
const base = {
  runId: `adapter-verify-${now}`,
  user: account.address,
  vault: null,
  chainId,
  ruleSet: rules,
  rulesHash: rulesHash(rules),
} as unknown as EngineState;

const context = await createContextLoader(arc)(base, AbortSignal.timeout(20_000));
const trade = await compileCandidate({ arc, context, candidate, candidateIndex: 0 });
const verdict = evaluateTrade({ candidate, trade, context, rules });
print("context block", context.fetchedAtBlock, "available", context.availableUsdc);
print(
  "local/chain chargeWad",
  trade.localChargeWad,
  trade.chainChargeWad,
  "limitUsdc",
  trade.limitUsdc,
);
print("risk", JSON.stringify(verdict));
assert.equal(verdict.passed, true, "risk must pass before publishing");

const arkiv = createProposalPublisher(settings, logger);
const state = {
  ...base,
  selected: trade,
  verdicts: [verdict],
  plan: { action: "trade", rationale: candidate.rationale, candidates: [candidate] },
} as unknown as EngineState;
const proposal = arkiv.publisher
  ? await arkiv.publisher.publish(state, AbortSignal.timeout(30_000)).catch(() => null)
  : null;
print("arkiv writer", JSON.stringify(arkiv.status), "proposal", proposal?.key ?? "unavailable");

const wallet = createWalletClient({ account, transport: http(rpcUrl, { timeout: 20_000 }) });
const gasPrice = 25_000_000_000n;
const approveTx = await wallet.writeContract({
  chain: null,
  address: deployments.usdc,
  abi: parseAbi(["function approve(address spender, uint256 amount) returns (bool)"]),
  functionName: "approve",
  args: [trade.call.to as Hex, BigInt(trade.limitUsdc)],
  gasPrice,
});
await arc.client.waitForTransactionReceipt({ hash: approveTx, timeout: 60_000 });
print("user approve tx", approveTx);
const tradeTx = await wallet.sendTransaction({
  chain: null,
  to: trade.call.to as Hex,
  data: trade.call.data as Hex,
  gasPrice,
});
print("user trade tx", tradeTx);
const verified = await confirmOnArc(arc.client, tradeTx, trade);
print("verified", JSON.stringify(verified));
if (proposal && arkiv.publisher) {
  const patched = await arkiv.publisher.approve(proposal.key, verified.txHash);
  print("arkiv approve tx", patched ?? "unavailable");
}
