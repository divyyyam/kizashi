import { and, asc, eq, gt, gte } from "@arkiv-network/sdk/query";
import { addr, i32, str, u64 } from "@arkiv-network/sdk/schema";
import type { Address, Hex } from "viem";
import type { ArkivReader } from "./client";
import {
  CurveSnapshotEntity,
  type CurveSnapshotPayload,
  curveSnapshotPayloadSchema,
  decodePayload,
  MARKET_KINDS,
  MARKET_STATUSES,
  MarketEntity,
  type MarketKind,
  type MarketPayload,
  type MarketStatus,
  marketPayloadSchema,
  PROJECT,
  ProbeEntity,
  ProposalEntity,
  type ProposalPayload,
  proposalPayloadSchema,
  SCHEMA_VERSION,
} from "./schemas";

/**
 * The three user-visible reads (arkiv/schema.md §Queries) plus a live-update helper. Anyone can
 * write an entity that matches a schema, so every read scopes to `project`, `v` and, when given,
 * the trusted writer (`owner`); rows that fail payload validation are dropped and counted.
 */

export const MAX_PAGE = 100;

export type Page<T> = { items: T[]; dropped: number };

export type MarketListing = {
  entityKey: Hex;
  owner: Address;
  expiresAtBlock: bigint;
  marketId: string;
  arcChainId: number;
  kind: MarketKind;
  status: MarketStatus;
  resolvesAtSec: number;
  arcAddress: Address;
  creator: Address;
  rulesRef: string;
  evidenceRef: string | undefined;
  payload: MarketPayload;
};

export type CurvePoint = {
  entityKey: Hex;
  marketId: string;
  tsSec: number;
  block: bigint;
  payload: CurveSnapshotPayload;
};

export type OpenProposal = {
  entityKey: Hex;
  owner: Address;
  expiresAtBlock: bigint;
  marketId: string;
  arcChainId: number;
  user: Address;
  runId: string;
  rulesHash: string;
  payload: ProposalPayload;
};

const scope = () => [eq("project", str(PROJECT)), eq("v", i32(SCHEMA_VERSION))] as const;
const clampLimit = (limit: number | undefined) =>
  Math.max(1, Math.min(MAX_PAGE, Math.floor(limit ?? MAX_PAGE)));
const isOneOf = <T extends string>(list: readonly T[], v: string): v is T =>
  (list as readonly string[]).includes(v);

/** Open markets that have not yet reached resolution, soonest first (the lobby). */
export async function openMarkets(
  reader: ArkivReader,
  options: { owner?: Address; arcChainId?: number; nowSec?: number; limit?: number } = {},
): Promise<Page<MarketListing>> {
  const now = options.nowSec ?? Math.floor(Date.now() / 1000);
  const filters = [
    ...scope(),
    eq("status", str("open")),
    gt("resolvesAt", u64(now)),
    ...(options.arcChainId === undefined ? [] : [eq("arcChainId", u64(options.arcChainId))]),
  ];
  let query = reader
    .select()
    .from(MarketEntity)
    .where(and(...filters))
    .orderBy(asc("resolvesAt"))
    .limit(clampLimit(options.limit));
  if (options.owner) query = query.ownedBy(options.owner);
  const result = await query.fetch();

  const items: MarketListing[] = [];
  let dropped = result.skipped ?? 0;
  for (const row of result.entities) {
    const payload = decodePayload(marketPayloadSchema, row.payload.value);
    const kind = row.kind.value;
    const status = row.status.value;
    if (!payload.ok || !isOneOf(MARKET_KINDS, kind) || !isOneOf(MARKET_STATUSES, status)) {
      dropped += 1;
      continue;
    }
    items.push({
      entityKey: row.$key,
      owner: row.$owner,
      expiresAtBlock: row.$expiresAt,
      marketId: row.marketId.value,
      arcChainId: Number(row.arcChainId.value),
      kind,
      status,
      resolvesAtSec: Number(row.resolvesAt.value),
      arcAddress: row.arcAddress.value,
      creator: row.creator.value,
      rulesRef: row.rulesRef.value,
      evidenceRef: row.evidenceRef?.value,
      payload: payload.value,
    });
  }
  return { items, dropped };
}

/** Crowd-distribution history for one market, oldest first (the curve chart). */
export async function curveHistory(
  reader: ArkivReader,
  marketId: string,
  options: { owner?: Address; arcChainId?: number; sinceSec?: number; limit?: number } = {},
): Promise<Page<CurvePoint>> {
  const filters = [
    ...scope(),
    eq("marketId", str(marketId)),
    gte("ts", u64(options.sinceSec ?? 0)),
    ...(options.arcChainId === undefined ? [] : [eq("arcChainId", u64(options.arcChainId))]),
  ];
  let query = reader
    .select()
    .from(CurveSnapshotEntity)
    .where(and(...filters))
    .orderBy(asc("ts"))
    .limit(clampLimit(options.limit));
  if (options.owner) query = query.ownedBy(options.owner);
  const result = await query.fetch();

  const items: CurvePoint[] = [];
  let dropped = result.skipped ?? 0;
  for (const row of result.entities) {
    const payload = decodePayload(curveSnapshotPayloadSchema, row.payload.value);
    if (!payload.ok) {
      dropped += 1;
      continue;
    }
    items.push({
      entityKey: row.$key,
      marketId: row.marketId.value,
      tsSec: Number(row.ts.value),
      block: row.block.value,
      payload: payload.value,
    });
  }
  return { items, dropped };
}

/** Open (unexpired, unapproved) engine proposals for a user, soonest-expiring first (the inbox). */
export async function openProposals(
  reader: ArkivReader,
  user: Address,
  options: { owner?: Address; marketId?: string; limit?: number } = {},
): Promise<Page<OpenProposal>> {
  const filters = [
    ...scope(),
    eq("user", addr(user)),
    eq("status", str("open")),
    ...(options.marketId === undefined ? [] : [eq("marketId", str(options.marketId))]),
  ];
  let query = reader
    .select()
    .from(ProposalEntity)
    .where(and(...filters))
    .orderBy(asc("$expiresAt"))
    .limit(clampLimit(options.limit));
  if (options.owner) query = query.ownedBy(options.owner);
  const result = await query.fetch();

  const items: OpenProposal[] = [];
  let dropped = result.skipped ?? 0;
  for (const row of result.entities) {
    const payload = decodePayload(proposalPayloadSchema, row.payload.value);
    if (!payload.ok) {
      dropped += 1;
      continue;
    }
    items.push({
      entityKey: row.$key,
      owner: row.$owner,
      expiresAtBlock: row.$expiresAt,
      marketId: row.marketId.value,
      arcChainId: Number(row.arcChainId.value),
      user: row.user.value,
      runId: row.runId.value,
      rulesHash: row.rulesHash.value,
      payload: payload.value,
    });
  }
  return { items, dropped };
}

/** Smoke-test read: probes by label, optionally scoped to the writer. */
export async function probesByLabel(reader: ArkivReader, label: string, owner?: Address) {
  let query = reader
    .select({ $key: true, $owner: true, label: true })
    .from(ProbeEntity)
    .where(and(...scope(), eq("label", str(label))))
    .limit(10);
  if (owner) query = query.ownedBy(owner);
  return (await query.fetch()).entities;
}

/**
 * Calls `onChange` (debounced per poll) whenever any Arkiv entity is created, patched or deleted,
 * so a reader can refetch the query it shows. Events carry no attributes, so filtering happens in
 * the refetch. Returns the unsubscribe function.
 */
export function watchChanges(
  reader: ArkivReader,
  onChange: (entityKeys: Hex[]) => void,
  onError?: (error: Error) => void,
): () => void {
  let pending: Hex[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const push = (key: Hex) => {
    pending.push(key);
    if (timer !== undefined) return;
    timer = setTimeout(() => {
      const keys = pending;
      pending = [];
      timer = undefined;
      onChange(keys);
    }, 250);
  };
  const unwatch = reader.watchEntityEvents({
    onEntityCreated: (e) => push(e.entityKey),
    onEntityPatched: (e) => push(e.entityKey),
    onEntityDeleted: (e) => push(e.entityKey),
    onError: (error) => onError?.(error),
  });
  return () => {
    if (timer !== undefined) clearTimeout(timer);
    unwatch();
  };
}

/** The newest listing for one market, in any status (market page metadata lookup). */
export async function listingByMarketId(
  reader: ArkivReader,
  marketId: string,
  options: { owner?: Address; arcChainId?: number } = {},
): Promise<MarketListing | undefined> {
  const filters = [
    ...scope(),
    eq("marketId", str(marketId)),
    ...(options.arcChainId === undefined ? [] : [eq("arcChainId", u64(options.arcChainId))]),
  ];
  let query = reader
    .select()
    .from(MarketEntity)
    .where(and(...filters))
    .orderBy(asc("resolvesAt"))
    .limit(10);
  if (options.owner) query = query.ownedBy(options.owner);
  const result = await query.fetch();
  for (const row of result.entities) {
    const payload = decodePayload(marketPayloadSchema, row.payload.value);
    const kind = row.kind.value;
    const status = row.status.value;
    if (!payload.ok || !isOneOf(MARKET_KINDS, kind) || !isOneOf(MARKET_STATUSES, status)) continue;
    return {
      entityKey: row.$key,
      owner: row.$owner,
      expiresAtBlock: row.$expiresAt,
      marketId: row.marketId.value,
      arcChainId: Number(row.arcChainId.value),
      kind,
      status,
      resolvesAtSec: Number(row.resolvesAt.value),
      arcAddress: row.arcAddress.value,
      creator: row.creator.value,
      rulesRef: row.rulesRef.value,
      evidenceRef: row.evidenceRef?.value,
      payload: payload.value,
    };
  }
  return undefined;
}
