import { addr, str, u64 } from "@arkiv-network/sdk/schema";
import type { ArkivWriter } from "./client";
import { curveSnapshotExpiry, marketExpiry, probeExpiry, proposalExpiry } from "./expiry";
import {
  CurveSnapshotEntity,
  type CurveSnapshotInput,
  curveSnapshotInputSchema,
  curveSnapshotPayloadSchema,
  encodePayload,
  MARKET_STATUSES,
  MarketEntity,
  type MarketListingInput,
  type MarketStatus,
  marketListingInputSchema,
  marketPayloadSchema,
  PROJECT,
  ProbeEntity,
  ProposalEntity,
  type ProposalInput,
  probePayloadSchema,
  proposalInputSchema,
  proposalPayloadSchema,
  SCHEMA_VERSION,
  txHashSchema,
} from "./schemas";

/**
 * Typed writes. Callers write only after the Arc event they mirror is final and indexed
 * (INTERFACES §8). Every write resolves once its transaction is in a block.
 */

const nowSec = () => Math.floor(Date.now() / 1000);
const base = { project: PROJECT, v: SCHEMA_VERSION } as const;

export async function publishMarketListing(writer: ArkivWriter, input: MarketListingInput) {
  const m = marketListingInputSchema.parse(input);
  return writer.createEntity(
    MarketEntity,
    {
      ...base,
      marketId: m.marketId,
      arcChainId: u64(m.arcChainId),
      kind: m.kind,
      status: m.status,
      resolvesAt: u64(m.resolvesAtSec),
      arcAddress: addr(m.arcAddress),
      creator: addr(m.creator),
      rulesRef: m.rulesRef,
      ...(m.evidenceRef === undefined ? {} : { evidenceRef: m.evidenceRef }),
      payload: encodePayload(marketPayloadSchema, m.payload),
    },
    { expiration: marketExpiry(m.resolvesAtSec, nowSec()) },
  );
}

export async function setMarketStatus(
  writer: ArkivWriter,
  entityKey: `0x${string}`,
  status: MarketStatus,
) {
  if (!MARKET_STATUSES.includes(status)) throw new Error(`unknown market status ${status}`);
  return writer.patchEntity(MarketEntity, entityKey, { set: { status: str(status) } });
}

export async function publishCurveSnapshot(writer: ArkivWriter, input: CurveSnapshotInput) {
  const s = curveSnapshotInputSchema.parse(input);
  return writer.createEntity(
    CurveSnapshotEntity,
    {
      ...base,
      marketId: s.marketId,
      arcChainId: u64(s.arcChainId),
      ts: u64(s.tsSec),
      block: u64(s.block),
      payload: encodePayload(curveSnapshotPayloadSchema, s.payload),
    },
    { expiration: curveSnapshotExpiry() },
  );
}

export async function publishProposal(writer: ArkivWriter, input: ProposalInput) {
  const p = proposalInputSchema.parse(input);
  return writer.createEntity(
    ProposalEntity,
    {
      ...base,
      marketId: p.marketId,
      arcChainId: u64(p.arcChainId),
      user: addr(p.user),
      status: "open",
      runId: p.runId,
      rulesHash: p.rulesHash,
      payload: encodePayload(proposalPayloadSchema, p.payload),
    },
    { expiration: proposalExpiry() },
  );
}

/** Marks a proposal approved once its Arc trade is confirmed. Never writes "expired". */
export async function markProposalApproved(
  writer: ArkivWriter,
  entityKey: `0x${string}`,
  txHash: string,
) {
  return writer.patchEntity(ProposalEntity, entityKey, {
    set: { status: str("approved"), txHash: str(txHashSchema.parse(txHash)) },
  });
}

/** Smoke-test write: a labelled probe with a 10-minute life. */
export async function publishProbe(writer: ArkivWriter, label: string, note: string) {
  return writer.createEntity(
    ProbeEntity,
    {
      ...base,
      label,
      payload: encodePayload(probePayloadSchema, { note, atSec: nowSec() }),
    },
    { expiration: probeExpiry() },
  );
}
