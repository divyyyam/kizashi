import { describe, expect, test } from "bun:test";
import {
  bFromSubsidy,
  bucketOf,
  costDown,
  costUp,
  divDown,
  divUp,
  expNegDown,
  expNegUp,
  freed,
  grossCollateral,
  grossFloors,
  lnAtLeastOneDown,
  lnAtLeastOneUp,
  lossBound,
  mulDown,
  mulUp,
  nettedCollateral,
  nettedFloor,
  normalise,
  prices,
  range,
  step,
  toUsdcDown,
  toUsdcUp,
  tradeCharge,
} from "../src/index";
import { big, bigs, type Case, golden, num } from "./golden";

const abs = (x: bigint): bigint => (x < 0n ? -x : x);
const bound = (c: Case): bigint => {
  const a = big(c, "absBound");
  const r = abs(big(c, "refFloor")) / 10n ** 12n;
  // biome-ignore lint/complexity/useMathMinMax: bigint operands; Math.min/max do not accept bigint
  return a > r ? a : r;
};

function bracket(c: Case, down: bigint, up: bigint, tol: bigint): void {
  expect(down <= big(c, "refFloor")).toBe(true);
  expect(up >= big(c, "refCeil")).toBe(true);
  expect(up - big(c, "refFloor") <= tol).toBe(true);
  expect(big(c, "refCeil") - down <= tol).toBe(true);
}

test("golden file covers at least 200 cases", () => {
  expect(Number(golden.total)).toBeGreaterThanOrEqual(200);
});

describe("oracle: transcendental bounds", () => {
  test.each(golden.exp ?? [])("exp $id", (c) => {
    bracket(c, expNegDown(big(c, "x")), expNegUp(big(c, "x")), big(c, "absBound"));
  });
  test.each(golden.ln ?? [])("ln $id", (c) => {
    bracket(c, lnAtLeastOneDown(big(c, "x")), lnAtLeastOneUp(big(c, "x")), big(c, "absBound"));
  });
  test.each(golden.cost ?? [])("cost $id", (c) => {
    const q = bigs(c, "q");
    const b = big(c, "b");
    bracket(c, costDown(q, b), costUp(q, b), bound(c));
  });
  test.each(golden.trade ?? [])("trade $id", (c) => {
    const charge = tradeCharge(bigs(c, "q"), bigs(c, "delta"), big(c, "b"));
    expect(charge >= big(c, "refCeil")).toBe(true);
    expect(charge - big(c, "refFloor") <= bound(c)).toBe(true);
  });
  test.each(golden.prices ?? [])("prices $id", (c) => {
    const p = prices(bigs(c, "q"), big(c, "b"));
    const ref = bigs(c, "refFloor");
    let total = 0n;
    p.forEach((x, i) => {
      const r = ref[i] ?? 0n;
      expect(x <= r + 1n && r - x <= big(c, "absBound")).toBe(true);
      total += x;
    });
    expect(total <= 10n ** 18n).toBe(true);
  });
  test.each(golden.subsidy ?? [])("subsidy $id", (c) => {
    const n = num(c, "n");
    const b = bFromSubsidy(big(c, "subsidyWad"), n);
    expect(b <= big(c, "refFloor")).toBe(true);
    expect(big(c, "refCeil") - b <= big(c, "absBound")).toBe(true);
    expect(lossBound(big(c, "lossB"), n) >= big(c, "lossRefCeil")).toBe(true);
    expect(lossBound(b, n) <= big(c, "subsidyWad")).toBe(true);
  });
});

describe("oracle: exact cases", () => {
  test.each(golden.usdc ?? [])("usdc $id", (c) => {
    expect(toUsdcDown(big(c, "wad"))).toBe(big(c, "down"));
    expect(toUsdcUp(big(c, "wad"))).toBe(big(c, "up"));
  });
  test.each(golden.muldiv ?? [])("muldiv $id", (c) => {
    const a = big(c, "a");
    const b = big(c, "b");
    expect([mulDown(a, b), mulUp(a, b), divDown(a, b), divUp(a, b)]).toEqual([
      big(c, "mulDown"),
      big(c, "mulUp"),
      big(c, "divDown"),
      big(c, "divUp"),
    ]);
  });
  test.each(golden.bucket ?? [])("bucket $id", (c) => {
    const grid = { n: num(c, "n"), lo: big(c, "lo"), w: big(c, "w") };
    expect(bucketOf(grid, big(c, "value"))).toBe(num(c, "bucket"));
  });
  test.each(golden.shapes ?? [])("shape $id", (c) => {
    const got =
      c.kind === "step"
        ? step(num(c, "n"), num(c, "k"), big(c, "size"))
        : range(num(c, "n"), num(c, "from"), num(c, "to"), big(c, "size"));
    expect(got).toEqual(bigs(c, "expected"));
  });
  test.each(golden.netting ?? [])("netting $id", (c) => {
    const tickets = (c.tickets as string[][]).map((t) => t.map((x) => BigInt(x)));
    expect(grossCollateral(tickets)).toBe(big(c, "gross"));
    expect(nettedCollateral(tickets)).toBe(big(c, "netted"));
    expect(freed(tickets)).toBe(big(c, "freed"));
    expect(grossFloors(tickets)).toBe(big(c, "grossFloors"));
    expect(nettedFloor(tickets)).toBe(big(c, "nettedFloor"));
    let position = tickets[0]?.map(() => 0n) ?? [];
    const topUps: bigint[] = [];
    for (const t of tickets) {
      const r = normalise(position, t);
      topUps.push(r.topUp);
      position = r.position;
    }
    expect(topUps).toEqual(bigs(c, "topUps"));
    expect(position).toEqual(bigs(c, "position"));
  });
});
