import { describe, expect, test } from "bun:test";
import {
  bFromSubsidy,
  costDown,
  costUp,
  expNegDown,
  expNegUp,
  lnAtLeastOneDown,
  lnAtLeastOneUp,
  lossBound,
  prices,
  tradeCharge,
} from "../src/index";
import { big, bigs, golden, num, parity } from "./golden";

/** F-TS2: exact equality with the actual frozen Solidity outputs, no tolerance. */
const sol = (fn: string, id: string): bigint => {
  const v = parity[fn]?.[id];
  if (v === undefined) throw new Error(`missing Solidity output ${fn} ${id}`);
  return BigInt(v);
};

describe("TS equals Solidity bit for bit", () => {
  test.each(golden.exp ?? [])("exp $id", (c) => {
    expect(expNegUp(big(c, "x"))).toBe(sol("expNegUp", c.id));
    expect(expNegDown(big(c, "x"))).toBe(sol("expNegDown", c.id));
  });
  test.each(golden.ln ?? [])("ln $id", (c) => {
    expect(lnAtLeastOneUp(big(c, "x"))).toBe(sol("lnAtLeastOneUp", c.id));
    expect(lnAtLeastOneDown(big(c, "x"))).toBe(sol("lnAtLeastOneDown", c.id));
  });
  test.each(golden.cost ?? [])("cost $id", (c) => {
    expect(costUp(bigs(c, "q"), big(c, "b"))).toBe(sol("costUp", c.id));
    expect(costDown(bigs(c, "q"), big(c, "b"))).toBe(sol("costDown", c.id));
  });
  test.each(golden.trade ?? [])("trade $id", (c) => {
    expect(tradeCharge(bigs(c, "q"), bigs(c, "delta"), big(c, "b"))).toBe(sol("tradeCharge", c.id));
  });
  test.each(golden.prices ?? [])("prices $id", (c) => {
    prices(bigs(c, "q"), big(c, "b")).forEach((p, j) => {
      expect(p).toBe(sol("prices", `${c.id}:${j}`));
    });
  });
  test.each(golden.subsidy ?? [])("subsidy $id", (c) => {
    expect(bFromSubsidy(big(c, "subsidyWad"), num(c, "n"))).toBe(sol("bFromSubsidy", c.id));
    expect(lossBound(big(c, "lossB"), num(c, "n"))).toBe(sol("lossBound", c.id));
  });
});
