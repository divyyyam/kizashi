// Drives one Suggest proposal through the HTTP API: approve, sign the returned call from the
// user's own wallet (USDC approve first), then post the txHash back for receipt verification.
import { createPublicClient, createWalletClient, type Hex, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

type Call = (
  path: string,
  init?: RequestInit,
  token?: string,
) => Promise<{ status: number; json: Record<string, unknown> | null }>;
type Pending = Record<string, unknown> & { tradeId?: string; to?: Hex; data?: Hex };

const USDC = "0x3600000000000000000000000000000000000000";
const GAS_PRICE = 25_000_000_000n;

export async function signPendingTrade(input: {
  call: Call;
  runId: string;
  token: string;
  privateKey: Hex;
  print: (...parts: unknown[]) => void;
}) {
  const { call, runId, token, print } = input;
  const json = { "Content-Type": "application/json" };
  const pending = async () =>
    ((await call(`/runs/${runId}`, {}, token)).json?.pending ?? null) as Pending | null;
  let approval = await pending();
  for (let i = 0; i < 20 && !approval?.tradeId; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    approval = await pending();
  }
  if (!approval?.tradeId || !("trade" in approval)) {
    print("no approval pending; the planner held or risk rejected the plan");
    return;
  }
  const trade = approval.trade as { limitUsdc: string };
  print("proposal", approval.tradeId, "limitUsdc", trade.limitUsdc, "arkiv", approval.proposalKey);
  const body = { v: 1, kind: "approval", decision: "approve", tradeId: approval.tradeId };
  await call(
    `/runs/${runId}/resume`,
    { method: "POST", headers: json, body: JSON.stringify(body) },
    token,
  );
  const tx = await pending();
  if (!tx?.to || !tx.data || !tx.tradeId) throw new Error("No transaction request after approval.");
  const rpcUrl = process.env.ARC_TESTNET_RPC_URL;
  if (!rpcUrl) throw new Error("ARC_TESTNET_RPC_URL is required to sign the trade.");
  const account = privateKeyToAccount(input.privateKey);
  const transport = http(rpcUrl, { timeout: 20_000 });
  const reader = createPublicClient({ transport });
  const wallet = createWalletClient({ account, transport });
  const approveTx = await wallet.writeContract({
    chain: null,
    address: USDC,
    abi: parseAbi(["function approve(address spender, uint256 amount) returns (bool)"]),
    functionName: "approve",
    args: [tx.to, BigInt(trade.limitUsdc)],
    gasPrice: GAS_PRICE,
  });
  await reader.waitForTransactionReceipt({ hash: approveTx, timeout: 60_000 });
  print("user approve tx", approveTx);
  const tradeTx = await wallet.sendTransaction({
    chain: null,
    to: tx.to,
    data: tx.data,
    gasPrice: GAS_PRICE,
  });
  print("user trade tx", tradeTx);
  const resume = { v: 1, kind: "userTx", tradeId: tx.tradeId, txHash: tradeTx };
  await call(
    `/runs/${runId}/resume`,
    { method: "POST", headers: json, body: JSON.stringify(resume) },
    token,
  );
  print("pending after confirm", JSON.stringify(await pending()));
}
