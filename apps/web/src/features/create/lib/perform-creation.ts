import type { Address, Hash, PublicClient, WalletClient } from "viem";
import { copy } from "@/content/copy";
import { requestMessage } from "@/lib/request";
import type { CreateFormValues } from "../types";
import { publishListing } from "./create-requests";
import { CreationSubmittedError, createTransaction } from "./create-transaction";
import type { CreateProgress, CreateStep } from "./creation-progress";
import type { PreparedImage } from "./image";
import { uploadCreation } from "./upload-creation";

type Context = {
  client: PublicClient;
  wallet: WalletClient;
  owner: Address;
  signal: AbortSignal;
  report: (progress: CreateProgress) => void;
};

export async function performCreation(
  context: Context,
  values: CreateFormValues,
  image: PreparedImage | undefined,
): Promise<CreateProgress> {
  let step: CreateStep = image ? "image" : "metadata";
  let metadataCid: string | undefined;
  let transactionHash: Hash | undefined;
  const report = (progress: CreateProgress) => {
    if (progress.phase === "running") {
      step = progress.step;
      transactionHash = progress.txHash;
    }
    context.report(progress);
  };
  try {
    const pinned = await uploadCreation({ ...context, values, image, report });
    metadataCid = pinned.cid;
    const created = await createTransaction(
      { ...context, report },
      { values, subsidyUsdc: pinned.subsidyUsdc, rulesRef: pinned.rulesRef },
    );
    report({ phase: "running", step: "listing", txHash: created.createTx });
    try {
      const entityKey = await publishListing(created.marketId, metadataCid, context.signal);
      return { phase: "done", ...created, metadataCid, listing: { entityKey } };
    } catch {
      return {
        phase: "done",
        ...created,
        metadataCid,
        listing: { error: copy.feedback.create.listingError },
      };
    }
  } catch (error) {
    return {
      phase: "failed",
      step,
      message: creationMessage(error, step),
      ...(metadataCid ? { metadataCid } : {}),
      ...(transactionHash ? { txHash: transactionHash } : {}),
      ...(error instanceof CreationSubmittedError
        ? { txHash: error.hash, creationSubmitted: true }
        : {}),
    };
  }
}

function creationMessage(error: unknown, step: CreateStep) {
  if (error instanceof CreationSubmittedError) return copy.feedback.create.partial;
  const message = error instanceof Error ? error.message : "";
  if (/User rejected|denied/i.test(message)) return copy.feedback.create.rejected;
  if (/insufficient/i.test(message)) return copy.feedback.create.insufficient;
  return requestMessage(
    error,
    step === "image" || step === "metadata"
      ? copy.feedback.create.uploadError
      : copy.feedback.create.generic,
  );
}
