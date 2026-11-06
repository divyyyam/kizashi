import { expect, test } from "bun:test";
import { WAD } from "@kizashi/core";
import type { PortfolioPosition } from "../types";
import { portfolioCollateral } from "./collateral";

const base: PortfolioPosition = {
  chainId: 31337,
  marketId: "0",
  owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  question: "Accounting verification",
  kind: "binary",
  grid: { n: 2, lo: 0n, w: 1n },
  unit: "u",
  precision: 0,
  status: "open",
  positionWad: [0n, 0n],
  history: { status: "complete", originalTicketsWad: [] },
  lifecycle: "active",
  blockHash: "0x01",
  blockNumber: 1n,
};
const wad = (values: readonly number[]) => values.map(BigInt).map((value) => value * WAD);
test.each([
  { tickets: [[10, 0]], p: [10, 0], gross: 0, netted: 0, freed: 0, floor: 0 },
  {
    tickets: [
      [10, 0],
      [0, 10],
    ],
    p: [10, 10],
    gross: 0,
    netted: 0,
    freed: 0,
    floor: 10,
  },
  { tickets: [[-10, 0]], p: [0, 10], gross: 10, netted: 10, freed: 0, floor: 0 },
  {
    tickets: [
      [-10, 0],
      [6, 0],
    ],
    p: [6, 10],
    gross: 10,
    netted: 4,
    freed: 6,
    floor: 6,
  },
  {
    tickets: [
      [-10, 0],
      [0, -10],
    ],
    p: [0, 0],
    gross: 20,
    netted: 10,
    freed: 10,
    floor: 0,
  },
  {
    tickets: [
      [-10, 0],
      [6, 0],
    ],
    p: [0, 4],
    gross: 10,
    netted: 4,
    freed: 6,
    floor: 0,
  },
])("accounting ledger %#", (row) => {
  const totals = portfolioCollateral([
    {
      ...base,
      positionWad: wad(row.p),
      history: { status: "complete", originalTicketsWad: row.tickets.map(wad) },
    },
  ]);
  expect(totals).toMatchObject({
    status: "ready",
    grossWad: BigInt(row.gross) * WAD,
    nettedWad: BigInt(row.netted) * WAD,
    freedWad: BigInt(row.freed) * WAD,
    floorWad: BigInt(row.floor) * WAD,
  });
});
test("independent markets never cross-net", () => {
  const positions = [
    [-10, 0],
    [0, -10],
  ].map((ticket, index) => ({
    ...base,
    marketId: String(index),
    history: { status: "complete" as const, originalTicketsWad: [wad(ticket)] },
  }));
  expect(portfolioCollateral(positions)).toMatchObject({
    grossWad: 20n * WAD,
    nettedWad: 20n * WAD,
    freedWad: 0n,
  });
});
test("missing history preserves actual floor; redeemed history is excluded", () => {
  expect(
    portfolioCollateral([
      {
        ...base,
        positionWad: wad([6, 10]),
        history: { status: "unavailable", reason: "Not indexed" },
      },
    ]),
  ).toMatchObject({ status: "unavailable", floorWad: 6n * WAD });
  expect(
    portfolioCollateral([{ ...base, lifecycle: "redeemed", positionWad: wad([6, 10]) }]),
  ).toMatchObject({ status: "ready", floorWad: 0n, grossWad: 0n });
});
