import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CurveSnapshotEntity,
  decodePayload,
  ENTITY_TYPES,
  encodePayload,
  MarketEntity,
  marketListingInputSchema,
  marketPayloadSchema,
  ProbeEntity,
  ProposalEntity,
  proposalPayloadSchema,
} from "../src";

const doc = readFileSync(join(import.meta.dir, "../../../arkiv/schema.md"), "utf8");

function docColumns(name: string): string[] {
  const start = doc.indexOf(`### \`${name}\``);
  expect(start).toBeGreaterThan(-1);
  const rows: string[] = [];
  for (const line of doc.slice(start).split("\n").slice(1)) {
    if (line.startsWith("### ") || line.startsWith("## ")) break;
    const m = line.match(/^\|\s*`([^`]+)`\s*\|\s*(\w+)\s*\|\s*(yes|no)\s*\|\s*(yes|no)\s*\|$/);
    if (m) rows.push(`${m[1]}:${m[2]}:${m[3]}:${m[4]}`);
  }
  return rows;
}

describe("arkiv/schema.md matches src/schemas.ts", () => {
  for (const schema of [MarketEntity, CurveSnapshotEntity, ProposalEntity, ProbeEntity]) {
    test(String(schema.name), () => {
      const code = Object.entries(schema.columns).map(
        ([n, c]) => `${n}:${c.type}:${c.isIndexed ? "yes" : "no"}:${c.isOptional ? "yes" : "no"}`,
      );
      expect(docColumns(String(schema.name))).toEqual(code);
    });
  }

  test("every entity type is documented", () => {
    for (const name of Object.values(ENTITY_TYPES)) expect(doc).toContain(`\`${name}\``);
  });
});

const market = {
  title: "ETH/USDC at Friday close",
  resolution: "twap" as const,
  subsidyUsdc: "10000000",
  closeTimeSec: 1_762_500_000,
  grid: { n: 8, loGrid: "-200", widthGrid: "50", gridDecimals: 2 },
};

describe("payload codec", () => {
  test("round-trips a market payload", () => {
    const raw = encodePayload(marketPayloadSchema, market);
    expect(decodePayload(marketPayloadSchema, raw)).toEqual({ ok: true, value: market });
  });

  test("rejects junk written by someone else", () => {
    const junk = new TextEncoder().encode('{"title":5}');
    expect(decodePayload(marketPayloadSchema, junk).ok).toBe(false);
    expect(decodePayload(marketPayloadSchema, "0xzz").ok).toBe(false);
  });

  test("rejects non-string money", () => {
    expect(() =>
      encodePayload(proposalPayloadSchema, {
        deltaWad: ["1", "-1"],
        limitUsdc: 5 as unknown as string,
        deadlineSec: 1_762_500_000,
        sizeUsdc: "1",
        risk: { ok: true, reasons: [] },
        reason: "x",
      }),
    ).toThrow();
  });
});

describe("listing input", () => {
  const input = {
    marketId: "1",
    arcChainId: 5042002,
    kind: "curve" as const,
    status: "open" as const,
    resolvesAtSec: 1_762_500_000,
    arcAddress: "0x02a1be2268c3d6bf27a5a0a3af0a77234bc2c724",
    creator: "0x02A1Be2268c3d6BF27A5A0a3AF0a77234Bc2c724",
    rulesRef: `0x${"ab".repeat(32)}`,
    payload: market,
  };

  test("checksums addresses", () => {
    expect(marketListingInputSchema.parse(input).arcAddress).toBe(
      "0x02A1Be2268c3d6BF27A5A0a3AF0a77234Bc2c724",
    );
  });

  test("refuses an expired status and bad ids", () => {
    expect(() => marketListingInputSchema.parse({ ...input, status: "expired" })).toThrow();
    expect(() => marketListingInputSchema.parse({ ...input, marketId: "01" })).toThrow();
    expect(() => marketListingInputSchema.parse({ ...input, rulesRef: "0x12" })).toThrow();
  });
});
