import {
  erc20Abi,
  factoryAddress,
  kizashiMarketFactoryAbi,
  usdcAddressByChainId,
} from "@kizashi/contracts";
import {
  type Address,
  type Hash,
  type PublicClient,
  parseEventLogs,
  type WalletClient,
} from "viem";
import { copy } from "@/content/copy";
import { appChain } from "@/lib/wagmi";
import type { CreateFormValues } from "../types";
import { createCall } from "./create-call";
import type { CreateProgress } from "./creation-progress";

const RECEIPT_TIMEOUT_MS = 60_000;
type Context = {
  client: PublicClient;
  wallet: WalletClient;
  owner: Address;
  signal: AbortSignal;
  report: (progress: CreateProgress) => void;
};

export class CreationSubmittedError extends Error {
  constructor(readonly hash: Hash) {
    super(copy.feedback.create.partial);
  }
}

async function approveSubsidy(context: Context, subsidyUsdc: bigint) {
  const { client, wallet, owner, signal, report } = context;
  const factory = factoryAddress(appChain.id);
  const usdc = usdcAddressByChainId(appChain.id);
  if (!factory || !usdc) throw new Error("deployment unavailable");
  report({ phase: "running", step: "approve" });
  const allowance = await client.readContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, factory],
  });
  if (allowance >= subsidyUsdc) return;
  signal.throwIfAborted();
  const request = {
    address: usdc,
    abi: erc20Abi,
    functionName: "approve",
    args: [factory, subsidyUsdc],
    account: owner,
    chain: appChain,
  } as const;
  await client.simulateContract(request);
  signal.throwIfAborted();
  const hash = await wallet.writeContract(request);
  report({ phase: "running", step: "approve", txHash: hash });
  const receipt = await client.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS });
  if (receipt.status !== "success") throw new Error("approval reverted");
}

export async function createTransaction(
  context: Context,
  input: { values: CreateFormValues; subsidyUsdc: bigint; rulesRef: `0x${string}` },
) {
  await approveSubsidy(context, input.subsidyUsdc);
  const { client, wallet, owner, signal, report } = context;
  const request = createCall({ ...input, owner });
  report({ phase: "running", step: "create" });
  signal.throwIfAborted();
  await client.simulateContract(request);
  signal.throwIfAborted();
  const createTx = await wallet.writeContract(request);
  report({ phase: "running", step: "create", txHash: createTx });
  let receipt: Awaited<ReturnType<PublicClient["waitForTransactionReceipt"]>>;
  try {
    receipt = await client.waitForTransactionReceipt({
      hash: createTx,
      timeout: RECEIPT_TIMEOUT_MS,
    });
  } catch {
    throw new CreationSubmittedError(createTx);
  }
  if (receipt.status !== "success") throw new Error("creation reverted");
  const event = parseEventLogs({
    abi: kizashiMarketFactoryAbi,
    eventName: "MarketCreated",
    logs: receipt.logs.filter((log) => log.address.toLowerCase() === request.address.toLowerCase()),
  })[0];
  if (event) return { marketId: event.args.marketId, createTx };
  throw new CreationSubmittedError(createTx);
}
