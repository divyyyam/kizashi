import {
  type Address,
  type Hash,
  keccak256,
  type PublicClient,
  parseUnits,
  stringToBytes,
  type WalletClient,
} from "viem";
import { copy } from "@/content/copy";
import { canonicalJson } from "@/lib/canonical-json";
import { requestMessage } from "@/lib/request";
import type { CreateFormValues } from "../types";
import { createMetadata } from "./create-metadata";
import { publishListing } from "./create-requests";
import { CreationSubmittedError, createTransaction } from "./create-transaction";
import type { CreateProgress, CreateStep } from "./creation-progress";

type Context = {
  client: PublicClient;
  wallet: WalletClient;
  owner: Address;
  signal: AbortSignal;
  report: (progress: CreateProgress) => void;
};

/** The rules document in canonical form, and the keccak256 the market commits to on Arc. */
export function buildRules(values: CreateFormValues, owner: Address) {
  const subsidyUsdc = parseUnits(values.subsidy, 6);
  const rulesJson = canonicalJson(createMetadata({ values, creator: owner, subsidyUsdc }));
  return { rulesJson, rulesRef: keccak256(stringToBytes(rulesJson)), subsidyUsdc };
}

export async function performCreation(
  context: Context,
  values: CreateFormValues,
): Promise<CreateProgress> {
  let step: CreateStep = "approve";
  let transactionHash: Hash | undefined;
  const report = (progress: CreateProgress) => {
    if (progress.phase === "running") {
      step = progress.step;
      transactionHash = progress.txHash;
    }
    context.report(progress);
  };
  let rulesJson: string | undefined;
  try {
    const rules = buildRules(values, context.owner);
    rulesJson = rules.rulesJson;
    const created = await createTransaction(
      { ...context, report },
      { values, subsidyUsdc: rules.subsidyUsdc, rulesRef: rules.rulesRef },
    );
    report({ phase: "running", step: "listing", txHash: created.createTx });
    try {
      const entityKey = await publishListing(created.marketId, rulesJson, context.signal);
      return { phase: "done", ...created, rulesJson, listing: { entityKey } };
    } catch {
      return {
        phase: "done",
        ...created,
        rulesJson,
        listing: { error: copy.feedback.create.listingError },
      };
    }
  } catch (error) {
    return {
      phase: "failed",
      step,
      message: creationMessage(error),
      ...(rulesJson ? { rulesJson } : {}),
      ...(transactionHash ? { txHash: transactionHash } : {}),
      ...(error instanceof CreationSubmittedError
        ? { txHash: error.hash, creationSubmitted: true }
        : {}),
    };
  }
}

function creationMessage(error: unknown) {
  if (error instanceof CreationSubmittedError) return copy.feedback.create.partial;
  const message = error instanceof Error ? error.message : "";
  if (/User rejected|denied/i.test(message)) return copy.feedback.create.rejected;
  if (/insufficient/i.test(message)) return copy.feedback.create.insufficient;
  return requestMessage(error, copy.feedback.create.generic);
}
