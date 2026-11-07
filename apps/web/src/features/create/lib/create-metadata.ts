import { MARKET_METADATA_VERSION, type MarketMetadata } from "@kizashi/schemas/market";
import type { Address } from "viem";
import { type CreateFormValues, gridOf, splitTags } from "../types";

const DISPUTE_WINDOW_SEC = 30 * 60;

export function createMetadata(options: {
  values: CreateFormValues;
  creator: Address;
  subsidyUsdc: bigint;
  image?: MarketMetadata["image"];
}): MarketMetadata {
  const { values, creator, subsidyUsdc, image } = options;
  const grid = gridOf(values);
  if (!grid) throw new Error("invalid grid");
  return {
    v: MARKET_METADATA_VERSION,
    creator,
    subsidyUsdc: subsidyUsdc.toString(),
    question: values.question,
    description: values.description,
    category: values.category,
    tags: splitTags(values.tags),
    ...(image ? { image } : {}),
    outcomes:
      values.kind === "binary"
        ? { kind: "binary", yes: values.yesLabel, no: values.noLabel }
        : {
            kind: "curve",
            unit: values.unit,
            low: values.low,
            high: values.high,
            buckets: Number(values.buckets),
            precision: grid.precision,
          },
    closeTimeSec: Math.floor(Date.parse(values.closesAt) / 1000),
    createdAtSec: Math.floor(Date.now() / 1000),
    resolution: {
      source: values.source,
      sourceName: values.sourceName,
      criteria: values.criteria,
      ...(values.sourceUrl ? { sourceUrl: values.sourceUrl } : {}),
      ...(values.edgeCases ? { edgeCases: values.edgeCases } : {}),
      disputeWindowSec: values.source === "manual" ? DISPUTE_WINDOW_SEC : 0,
    },
  };
}
