import {
  erc20Abi,
  factoryAddress,
  kizashiMarketFactoryAbi,
  kizashiPoolAbi,
  usdcAddressByChainId,
} from "@kizashi/contracts";
import type { approvalNeededSchema, txNeededSchema } from "@kizashi/schemas/engine";
import {
  type Address,
  encodeFunctionData,
  getAddress,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import type { z } from "zod";
import { workspaceCopy } from "@/content/model-workspace-copy";

export type Approval = z.infer<typeof approvalNeededSchema>;
export type TransactionRequest = z.infer<typeof txNeededSchema>;
type Clients = {
  publicClient: PublicClient;
  walletClient: WalletClient;
  account: Address;
  chainId: number;
};
const RECEIPT_TIMEOUT_MS = 90_000;

export function validateTradeCall(
  approval: Approval,
  transaction: TransactionRequest,
  identity: { account: Address; chainId: number; pool: Address; nowSec: number },
) {
  const { trade } = approval;
  if (
    !approval.verdict.passed ||
    approval.tradeId !== transaction.tradeId ||
    trade.chainId !== identity.chainId ||
    getAddress(trade.positionOwner) !== getAddress(identity.account) ||
    getAddress(transaction.to) !== getAddress(identity.pool) ||
    identity.nowSec >= Math.min(transaction.expiresAtSec, approval.expiresAtSec, trade.deadlineSec)
  )
    throw new Error(workspaceCopy.tradeMismatch);
  const expected = encodeFunctionData({
    abi: kizashiPoolAbi,
    functionName: "trade",
    args: [trade.payoutWad.map(BigInt), BigInt(trade.limitUsdc), BigInt(trade.deadlineSec)],
  });
  if (transaction.data.toLowerCase() !== expected.toLowerCase())
    throw new Error(workspaceCopy.tradeMismatch);
  return {
    delta: trade.payoutWad.map(BigInt),
    limit: BigInt(trade.limitUsdc),
    deadline: BigInt(trade.deadlineSec),
  };
}

async function waitReceipt(publicClient: PublicClient, hash: Hex) {
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: RECEIPT_TIMEOUT_MS,
  });
  if (receipt.status !== "success") throw new Error(workspaceCopy.tradeFailed);
}

async function authorizeUsdc(clients: Clients, pool: Address, limit: bigint) {
  const { publicClient, walletClient, account, chainId } = clients;
  const usdc = usdcAddressByChainId(chainId);
  if (!usdc) throw new Error(workspaceCopy.walletUnavailable);
  const allowance = await publicClient.readContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "allowance",
    args: [account, pool],
  });
  if (allowance >= limit) return;
  const { request } = await publicClient.simulateContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "approve",
    args: [pool, limit],
    account,
  });
  const hash = await walletClient.writeContract({ ...request, account, chain: walletClient.chain });
  await waitReceipt(publicClient, hash);
}

export async function signEngineTrade(
  input: Clients & {
    approval: Approval;
    transaction: TransactionRequest;
    onHash: (hash: Hex) => void;
  },
) {
  const { publicClient, walletClient, account, chainId, approval, transaction } = input;
  const factory = factoryAddress(chainId);
  if (!factory || !/^[1-9][0-9]*$/.test(approval.trade.marketId))
    throw new Error(workspaceCopy.tradeMismatch);
  const pool = await publicClient.readContract({
    address: factory,
    abi: kizashiMarketFactoryAbi,
    functionName: "poolOf",
    args: [BigInt(approval.trade.marketId)],
  });
  const call = validateTradeCall(approval, transaction, {
    account,
    chainId,
    pool,
    nowSec: Math.floor(Date.now() / 1000),
  });
  await authorizeUsdc(input, pool, call.limit);
  validateTradeCall(approval, transaction, {
    account,
    chainId,
    pool,
    nowSec: Math.floor(Date.now() / 1000),
  });
  const { request } = await publicClient.simulateContract({
    address: pool,
    abi: kizashiPoolAbi,
    functionName: "trade",
    args: [call.delta, call.limit, call.deadline],
    account,
  });
  const hash = await walletClient.writeContract({ ...request, account, chain: walletClient.chain });
  input.onHash(hash);
  await waitReceipt(publicClient, hash);
  return hash;
}

export async function confirmEngineTransaction(publicClient: PublicClient, hash: Hex) {
  await waitReceipt(publicClient, hash);
  return hash;
}
