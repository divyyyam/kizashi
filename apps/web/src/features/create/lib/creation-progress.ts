import type { Hash } from "viem";
import type { CreateFormValues } from "../types";
import type { PreparedImage } from "./image";

export type CreateStep = "image" | "metadata" | "approve" | "create" | "listing";
export type CreateProgress =
  | { phase: "idle" }
  | { phase: "running"; step: CreateStep; txHash?: Hash }
  | {
      phase: "failed";
      step: CreateStep;
      message: string;
      marketId?: bigint;
      metadataCid?: string;
      txHash?: Hash;
      creationSubmitted?: boolean;
    }
  | {
      phase: "done";
      marketId: bigint;
      createTx: Hash;
      metadataCid: string;
      listing: { entityKey?: string; error?: string };
    };

export type CreateMarket = {
  ready: boolean;
  reason?: string;
  progress: CreateProgress;
  isRetrying: boolean;
  create: (values: CreateFormValues, image: PreparedImage | undefined) => Promise<void>;
  retryListing: () => Promise<void>;
};
