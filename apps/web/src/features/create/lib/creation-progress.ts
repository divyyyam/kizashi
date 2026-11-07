import type { Hash } from "viem";
import type { CreateFormValues } from "../types";

export type CreateStep = "approve" | "create" | "listing";
export type CreateProgress =
  | { phase: "idle" }
  | { phase: "running"; step: CreateStep; txHash?: Hash }
  | {
      phase: "failed";
      step: CreateStep;
      message: string;
      marketId?: bigint;
      rulesJson?: string;
      txHash?: Hash;
      creationSubmitted?: boolean;
    }
  | {
      phase: "done";
      marketId: bigint;
      createTx: Hash;
      rulesJson: string;
      listing: { entityKey?: string; error?: string };
    };

export type CreateMarket = {
  ready: boolean;
  reason?: string;
  progress: CreateProgress;
  isRetrying: boolean;
  create: (values: CreateFormValues) => Promise<void>;
  retryListing: () => Promise<void>;
};
