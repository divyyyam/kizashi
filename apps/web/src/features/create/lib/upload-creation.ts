import type { MarketMetadata } from "@kizashi/schemas/market";
import { type Address, parseUnits } from "viem";
import { requestJson } from "@/lib/request";
import type { CreateFormValues } from "../types";
import { createMetadata } from "./create-metadata";
import { imageUploadSchema, metadataUploadSchema } from "./create-requests";
import type { CreateProgress } from "./creation-progress";
import type { PreparedImage } from "./image";

type Context = {
  values: CreateFormValues;
  image: PreparedImage | undefined;
  owner: Address;
  signal: AbortSignal;
  report: (progress: CreateProgress) => void;
};

export async function uploadCreation({ values, image, owner, signal, report }: Context) {
  let imageMetadata: MarketMetadata["image"];
  if (image) {
    report({ phase: "running", step: "image" });
    imageMetadata = await uploadImage(image, signal);
  }
  report({ phase: "running", step: "metadata" });
  const subsidyUsdc = parseUnits(values.subsidy, 6);
  const metadata = createMetadata({ values, creator: owner, subsidyUsdc, image: imageMetadata });
  const body = new FormData();
  body.set("kind", "metadata");
  body.set("metadata", JSON.stringify(metadata));
  const pinned = await requestJson({
    url: "/api/ipfs",
    schema: metadataUploadSchema,
    body,
    signal,
  });
  return { ...pinned, subsidyUsdc };
}

async function uploadImage(image: PreparedImage, signal: AbortSignal) {
  const body = new FormData();
  body.set("kind", "image");
  body.set("file", image.blob, "image.webp");
  const result = await requestJson({ url: "/api/ipfs", schema: imageUploadSchema, body, signal });
  return { ...result, width: image.width, height: image.height };
}
