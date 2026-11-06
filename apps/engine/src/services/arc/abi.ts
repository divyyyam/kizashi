import { parseAbi } from "viem";

// Fragments of the frozen IKizashiPool / KizashiMarketFactory surface the engine reads.
// @kizashi/contracts ships no generated ABIs yet; these mirror contracts/src exactly.
export const poolAbi = parseAbi([
  "struct Config { uint256 n; int256 lo; int256 w; address collateral; }",
  "struct Quote { int256 chargeWad; int256 chargeUsdc; int256 topUpWad; int256[] normalizedDelta; int256[] pricesAfter; }",
  "function config() view returns (Config)",
  "function state() view returns (uint8)",
  "function closeTime() view returns (uint64)",
  "function b() view returns (int256)",
  "function q() view returns (int256[])",
  "function prices() view returns (int256[])",
  "function positionOf(address owner) view returns (int256[])",
  "function floorOf(address owner) view returns (int256)",
  "function quote(address owner, int256[] delta) view returns (Quote)",
  "function trade(int256[] delta, int256 limitUsdc, uint64 deadline) returns (Quote)",
  "event Traded(address indexed owner, int256[] delta, int256 topUpWad, int256 chargeWad, int256 chargeUsdc)",
]);

export const factoryAbi = parseAbi([
  "function marketCount() view returns (uint256)",
  "function poolOf(uint256 marketId) view returns (address)",
]);

export const erc20Abi = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);
