import { addr, bytes, defineSchema, i32, str, u64 } from "@arkiv-network/sdk/schema";
import { bytesToString, getAddress, type Hex, hexToBytes, isAddress, stringToBytes } from "viem";
import { z } from "zod";

/**
 * Kizashi entity schemas on Arkiv. Frozen at ARK-01; arkiv/schema.md is the human copy and
 * test/schemas.test.ts checks the two agree. Arkiv is a public mirror and discovery layer: no
 * entity here moves or authorises money, and Arc state wins on any conflict.
 */

/** Every Kizashi entity carries `project = PROJECT`; every query filters on it. */
export const PROJECT = "kizashi";
/** Bumped on any breaking change to columns or payloads; readers filter on it. */
export const SCHEMA_VERSION = 1;

export const ENTITY_TYPES = {
  market: "kizashi.market",
  curveSnapshot: "kizashi.curveSnapshot",
  proposal: "kizashi.proposal",
  probe: "kizashi.probe",
} as const;
export type EntityType = keyof typeof ENTITY_TYPES;

/** Attribute names (Arkiv columns). Change only with a SCHEMA_VERSION bump. */
export const ATTR = {
  project: "project",
  version: "v",
  marketId: "marketId",
  arcChainId: "arcChainId",
  kind: "kind",
  status: "status",
  resolvesAt: "resolvesAt",
  arcAddress: "arcAddress",
  creator: "creator",
  rulesRef: "rulesRef",
  evidenceRef: "evidenceRef",
  ts: "ts",
  block: "block",
  user: "user",
  runId: "runId",
  txHash: "txHash",
  rulesHash: "rulesHash",
  label: "label",
  payload: "payload",
} as const;

export const MARKET_KINDS = ["binary", "curve"] as const;
export type MarketKind = (typeof MARKET_KINDS)[number];
/** No "expired": Arkiv has no expiry event, so expiry itself is the signal. */
export const MARKET_STATUSES = ["open", "closed", "resolved"] as const;
export type MarketStatus = (typeof MARKET_STATUSES)[number];
export const PROPOSAL_STATUSES = ["open", "approved"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

const common = {
  project: str().indexed(),
  v: i32().indexed(),
};

export const MarketEntity = defineSchema(ENTITY_TYPES.market, {
  ...common,
  marketId: str().indexed(),
  arcChainId: u64().indexed(),
  kind: str().indexed(),
  status: str().indexed(),
  resolvesAt: u64().indexed(),
  arcAddress: addr().indexed(),
  creator: addr().indexed(),
  rulesRef: str(),
  evidenceRef: str().optional(),
  payload: bytes(),
});

export const CurveSnapshotEntity = defineSchema(ENTITY_TYPES.curveSnapshot, {
  ...common,
  marketId: str().indexed(),
  arcChainId: u64().indexed(),
  ts: u64().indexed(),
  block: u64(),
  payload: bytes(),
});

export const ProposalEntity = defineSchema(ENTITY_TYPES.proposal, {
  ...common,
  marketId: str().indexed(),
  arcChainId: u64().indexed(),
  user: addr().indexed(),
  status: str().indexed(),
  runId: str().indexed(),
  rulesHash: str(),
  txHash: str().optional(),
  payload: bytes(),
});

/** Labelled, short-lived entity used only by the testnet smoke test. */
export const ProbeEntity = defineSchema(ENTITY_TYPES.probe, {
  ...common,
  label: str().indexed(),
  payload: bytes(),
});

// ---- attribute value checks (Arkiv `str` values are at most 128 bytes) ----

const decimalId = z.string().regex(/^(0|[1-9]\d{0,77})$/, "decimal integer string");
const signedDecimal = z.string().regex(/^-?(0|[1-9]\d{0,77})$/, "signed decimal integer string");
const hex32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/, "0x-prefixed 32-byte hex");
const address = z
  .string()
  .refine((value) => isAddress(value, { strict: false }), "address")
  .transform((value) => getAddress(value));
const unixSec = z
  .number()
  .int()
  .positive()
  .max(2 ** 40);
const shortText = (max: number) => z.string().min(1).max(max);

export const marketIdSchema = decimalId;
const ipfsCid = z.string().regex(/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,100})$/, "IPFS CID");
export const swarmRefSchema = z.string().regex(/^[0-9a-f]{64}$/, "64-char Swarm reference");

// ---- payloads (JSON in the `payload` bytes column; money in INTERFACES §3 string units) ----

export const marketPayloadSchema = z.object({
  title: shortText(160),
  description: z.string().max(1000).optional(),
  resolution: z.enum(["manual", "twap"]),
  subsidyUsdc: decimalId,
  closeTimeSec: unixSec,
  grid: z.object({
    n: z.number().int().min(2).max(256),
    loGrid: signedDecimal,
    widthGrid: decimalId,
    gridDecimals: z.number().int().min(0).max(18),
    unit: z.string().max(24).optional(),
  }),
  outcomeLabels: z.array(shortText(48)).max(256).optional(),
  /** Optional since v1: full market metadata (question, rules, image) pinned on IPFS. */
  category: z.string().max(24).optional(),
  metadataCid: ipfsCid.optional(),
  imageCid: ipfsCid.optional(),
});
export type MarketPayload = z.infer<typeof marketPayloadSchema>;

export const curveSnapshotPayloadSchema = z.object({
  bWad: decimalId,
  qWad: z.array(signedDecimal).min(2).max(256),
  pricesWad: z.array(decimalId).min(2).max(256),
  volumeUsdc: decimalId.optional(),
});
export type CurveSnapshotPayload = z.infer<typeof curveSnapshotPayloadSchema>;

export const proposalPayloadSchema = z.object({
  deltaWad: z.array(signedDecimal).min(2).max(256),
  limitUsdc: signedDecimal,
  deadlineSec: unixSec,
  sizeUsdc: decimalId,
  risk: z.object({ ok: z.boolean(), reasons: z.array(z.string().max(64)).max(16) }),
  reason: z.string().max(280),
});
export type ProposalPayload = z.infer<typeof proposalPayloadSchema>;

export const probePayloadSchema = z.object({ note: z.string().max(280), atSec: unixSec });
export type ProbePayload = z.infer<typeof probePayloadSchema>;

// ---- write inputs (attributes + payload), validated before anything is sent ----

export const marketListingInputSchema = z.object({
  marketId: decimalId,
  arcChainId: z.number().int().positive(),
  kind: z.enum(MARKET_KINDS),
  status: z.enum(MARKET_STATUSES),
  resolvesAtSec: unixSec,
  arcAddress: address,
  creator: address,
  rulesRef: hex32,
  evidenceRef: swarmRefSchema.optional(),
  payload: marketPayloadSchema,
});
export type MarketListingInput = z.input<typeof marketListingInputSchema>;

export const curveSnapshotInputSchema = z.object({
  marketId: decimalId,
  arcChainId: z.number().int().positive(),
  tsSec: unixSec,
  block: z.bigint().nonnegative(),
  payload: curveSnapshotPayloadSchema,
});
export type CurveSnapshotInput = z.input<typeof curveSnapshotInputSchema>;

export const proposalInputSchema = z.object({
  marketId: decimalId,
  arcChainId: z.number().int().positive(),
  user: address,
  runId: shortText(96),
  rulesHash: hex32,
  payload: proposalPayloadSchema,
});
export type ProposalInput = z.input<typeof proposalInputSchema>;

export const txHashSchema = hex32;

// ---- payload codec ----

export function encodePayload<T>(schema: z.ZodType<T>, value: T): Uint8Array {
  return stringToBytes(JSON.stringify(schema.parse(value)));
}

export type Decoded<T> = { ok: true; value: T } | { ok: false; reason: string };

/** Decodes a payload read from Arkiv. Anyone can write a matching entity, so failure is expected. */
export function decodePayload<T>(schema: z.ZodType<T>, raw: Hex | Uint8Array): Decoded<T> {
  try {
    const text = bytesToString(typeof raw === "string" ? hexToBytes(raw) : raw);
    const parsed = schema.safeParse(JSON.parse(text));
    return parsed.success
      ? { ok: true, value: parsed.data }
      : { ok: false, reason: parsed.error.issues[0]?.message ?? "invalid payload" };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "undecodable payload" };
  }
}
