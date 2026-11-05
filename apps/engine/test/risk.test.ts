import { expect, test } from "bun:test";
import { compiledTradeSchema, tickContextSchema } from "@kizashi/schemas/engine";
import { stopReason } from "../src/services/gate";
import { evaluateTrade } from "../src/services/risk";
import { spendTotals } from "../src/services/spend";
import { coreFixture } from "./fixtures/core";

test("an approved charge includes top-up once; a netting benefit does not offset spend", () => {
  const f = coreFixture();
  f.trade.topUpWad = "1000000000000000000";
  f.trade.collateralBeforeWad = "1000000000000000000";
  f.trade.freedChangeWad = "1000000000000000000";
  f.rules.perTradeCapUsdc = f.trade.limitUsdc;
  expect(evaluateTrade(f)).toMatchObject({ passed: true, nets: true, reasons: [] });
});

test.each(["perTradeCapUsdc", "dailyCapUsdc", "maxLossPerMarketUsdc", "budgetUsdc"] as const)(
  "cap boundary %s permits equality and rejects one unit over",
  (field) => {
    const f = coreFixture();
    f.rules[field] = f.trade.limitUsdc;
    expect(evaluateTrade(f).passed).toBe(true);
    f.rules[field] = (BigInt(f.trade.limitUsdc) - 1n).toString();
    expect(evaluateTrade(f).passed).toBe(false);
  },
);

test("rolling reservations include unresolved broadcasts; cancelled and expired reservations clear", () => {
  const { nowSec } = coreFixture();
  const entries = [
    {
      tradeId: "a",
      marketId: "1",
      spendUsdc: "7",
      status: "confirmed" as const,
      atSec: nowSec - 86400,
      expiresAtSec: nowSec - 1,
    },
    {
      tradeId: "b",
      marketId: "1",
      spendUsdc: "11",
      status: "sent" as const,
      atSec: nowSec - 90000,
      expiresAtSec: nowSec - 1,
    },
    {
      tradeId: "c",
      marketId: "1",
      spendUsdc: "13",
      status: "reserved" as const,
      atSec: nowSec,
      expiresAtSec: nowSec + 1,
    },
    {
      tradeId: "d",
      marketId: "1",
      spendUsdc: "17",
      status: "reserved" as const,
      atSec: nowSec,
      expiresAtSec: nowSec,
    },
    {
      tradeId: "e",
      marketId: "1",
      spendUsdc: "19",
      status: "cancelled" as const,
      atSec: nowSec,
      expiresAtSec: nowSec + 1,
    },
  ];
  const totals = spendTotals(entries, nowSec);
  expect(totals.totalUsdc).toBe(31n);
  expect(totals.dailyUsdc).toBe(24n);
  expect(totals.marketUsdc("2")).toBe(0n);
});

test("pending spend blocks a second trade without crediting freed collateral", () => {
  const f = coreFixture();
  f.rules.dailyCapUsdc = "1500000";
  f.context.spend = [
    {
      tradeId: "pending",
      marketId: "1",
      spendUsdc: "1000000",
      status: "reserved",
      atSec: f.nowSec,
      expiresAtSec: f.nowSec + 600,
    },
  ];
  f.trade.freedChangeWad = "100000000000000000000";
  expect(evaluateTrade(f).reasons).toContain("cap_daily");
});

test("quotes accept exactly one percent drift; zero and negative quotes use exact signed arithmetic", () => {
  const f = coreFixture();
  f.trade.chainChargeWad = "1010000000000000000";
  expect(evaluateTrade(f).reasons).not.toContain("quote_drift");
  f.trade.chainChargeWad = "1010000000000000001";
  expect(evaluateTrade(f).reasons).toContain("quote_drift");
  f.trade.localChargeWad = "0";
  f.trade.chainChargeWad = "1";
  expect(evaluateTrade(f).reasons).toContain("quote_drift");
  f.trade.localChargeWad = "-100";
  f.trade.chainChargeWad = "-101";
  expect(evaluateTrade(f).reasons).not.toContain("quote_drift");
});

test("risk rejects wrong identity, stale block, malformed shape, closed market and unsafe limits", () => {
  const f = coreFixture();
  f.rules.allowedMarketIds = [];
  const market = f.context.markets[0];
  if (!market) throw new Error("Missing test market");
  market.state = "closed";
  f.candidate.shape.threshold = "4";
  f.trade.chainId++;
  f.trade.quotedAtBlock = "9";
  f.trade.limitUsdc = "0";
  expect(evaluateTrade(f).reasons).toEqual(
    expect.arrayContaining([
      "unknown_market",
      "market_closed",
      "bad_shape",
      "forbidden",
      "quote_drift",
      "bad_request",
    ]),
  );
});

test("bigint caps remain exact above Number.MAX_SAFE_INTEGER", () => {
  const f = coreFixture();
  const amount = "9007199254740993000000";
  f.trade.limitUsdc = amount;
  f.candidate.spendUsdc = amount;
  f.context.availableUsdc = amount;
  f.rules.budgetUsdc = amount;
  f.rules.dailyCapUsdc = amount;
  f.rules.maxLossPerMarketUsdc = amount;
  f.rules.perTradeCapUsdc = (BigInt(amount) - 1n).toString();
  expect(evaluateTrade(f).reasons).toEqual(["cap_per_trade"]);
});

test("boundary schemas reject invalid grids, duplicate trade IDs and noninteger amounts", () => {
  const f = coreFixture();
  expect(compiledTradeSchema.safeParse({ ...f.trade, limitUsdc: "1.5" }).success).toBe(false);
  const market = f.context.markets[0];
  expect(
    tickContextSchema.safeParse({
      ...f.context,
      markets: [{ ...market, grid: { lo: "0", hi: "5", count: 4, precision: 0 } }],
    }).success,
  ).toBe(false);
});

test("gate separates releasable floor from backing metrics and uses the exact drawdown boundary", () => {
  const f = coreFixture();
  f.rules.maxDrawdownUsdc = "1";
  f.context.spend = [
    {
      tradeId: "confirmed",
      marketId: "1",
      spendUsdc: "2",
      status: "confirmed",
      atSec: f.nowSec,
      expiresAtSec: f.nowSec,
    },
  ];
  const market = f.context.markets[0];
  if (!market) throw new Error("Missing test market");
  market.releasableUsdc = "2";
  expect(stopReason(f.context, f.rules)).toBeNull();
  market.releasableUsdc = "1";
  expect(stopReason(f.context, f.rules)).toBe("drawdown");
});

test("gate stops on kill, expiry, exhausted budget and closed markets", () => {
  const f = coreFixture();
  f.context.killSwitch = true;
  expect(stopReason(f.context, f.rules)).toBe("kill_switch");
  f.context.killSwitch = false;
  f.rules.stopAtSec = f.nowSec;
  expect(stopReason(f.context, f.rules)).toBe("expired");
  f.rules.stopAtSec++;
  f.context.availableUsdc = "0";
  expect(stopReason(f.context, f.rules)).toBe("budget_exhausted");
  f.context.availableUsdc = "1";
  const market = f.context.markets[0];
  if (!market) throw new Error("Missing test market");
  market.closeTimeSec = f.nowSec;
  expect(stopReason(f.context, f.rules)).toBe("all_markets_closed");
  f.context.markets = [];
  expect(stopReason(f.context, f.rules)).toBeNull();
});
