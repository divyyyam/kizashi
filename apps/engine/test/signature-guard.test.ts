import { expect, test } from "bun:test";
import { engineSnapshotSchema, type SpendEntry } from "@kizashi/schemas/engine";
import { createSignatureGuard } from "../src/services/signature-guard";
import { validTransition } from "../src/services/spend-store";
import { coreFixture } from "./fixtures/core";

function harness() {
  const f = coreFixture();
  const state = engineSnapshotSchema.parse({
    ...f.input,
    selected: f.trade,
    plan: { action: "trade", rationale: "Test", candidates: [f.candidate] },
    approvalExpiresAtSec: f.nowSec + 600,
    selectionRevision: 1,
  });
  const reservations: SpendEntry[] = [];
  const guard = createSignatureGuard({
    loadContext: async () => f.context,
    refreshQuote: async () => f.trade,
    reserve: async (_run, entry) => {
      reservations.push(entry);
    },
    nowSec: () => f.nowSec,
  });
  return { ...f, state, guard, reservations };
}

test("signature guard reserves the maximum authorized charge once without adding top-up", async () => {
  const f = harness();
  f.trade.topUpWad = "1000000000000000000";
  await f.guard(f.state);
  expect(f.reservations[0]).toMatchObject({ spendUsdc: "1000000", status: "reserved" });
});

test("a changed quote or exhausted pending budget prevents signature", async () => {
  const f = harness();
  f.trade.chainChargeWad = "2000000000000000000";
  await expect(f.guard(f.state)).rejects.toMatchObject({ code: "quote_drift" });
  expect(f.reservations).toHaveLength(0);
  f.trade.chainChargeWad = f.trade.localChargeWad;
  f.context.availableUsdc = "1500000";
  f.context.spend = [
    {
      tradeId: "other",
      marketId: "1",
      spendUsdc: "1000000",
      status: "reserved",
      atSec: f.nowSec,
      expiresAtSec: f.nowSec + 600,
    },
  ];
  await expect(f.guard(f.state)).rejects.toMatchObject({ code: "cap_budget" });
});

test("revalidation binds the wallet, rules hash, vector, deadline and calldata", async () => {
  const f = harness();
  f.trade.call.data = "0xabcd01";
  await expect(f.guard(f.state)).rejects.toMatchObject({ code: "trade_id_mismatch" });
  const g = harness();
  g.state.ruleSet.budgetUsdc = "1";
  await expect(g.guard(g.state)).rejects.toMatchObject({ code: "rules_invalid" });
});

test("kill switch is reread before signature; broadcast reservations never expire as unsent", async () => {
  const f = harness();
  f.context.killSwitch = true;
  await expect(f.guard(f.state)).rejects.toMatchObject({ code: "no_pending_interrupt" });
  expect(validTransition("sent", "expired")).toBe(false);
  expect(validTransition("sent", "cancelled")).toBe(false);
  expect(validTransition("sent", "confirmed")).toBe(true);
  expect(validTransition("reserved", "expired")).toBe(true);
});

test("an approval that expires during quote refresh never reserves cash", async () => {
  const f = harness();
  let nowSec = f.nowSec;
  const guard = createSignatureGuard({
    loadContext: async () => f.context,
    refreshQuote: async () => {
      nowSec += 601;
      return f.trade;
    },
    nowSec: () => nowSec,
    reserve: async () => {
      throw new Error("Expired approval must not reserve cash");
    },
  });
  await expect(guard(f.state)).rejects.toMatchObject({ code: "no_pending_interrupt" });
});
