import { parseAbi } from "viem";

export const kizashiMarketFactoryAbi = parseAbi([
  "struct Config { uint256 n; int256 lo; int256 w; address collateral; }",
  "struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }",
  "struct PriceSource { PoolKey key; bool baseIsToken0; uint8 baseDecimals; uint8 quoteDecimals; uint8 gridDecimals; uint32 window; uint16 minObservations; uint128 minLiquidity; }",
  "struct MarketParams { Config config; uint256 subsidyUsdc; uint64 closeTime; uint8 kind; uint8 resolution; bytes32 rulesRef; PriceSource priceSource; }",
  "function createMarket(MarketParams p) returns (uint256 marketId, address pool)",
  "function marketCount() view returns (uint256)",
  "function poolOf(uint256 marketId) view returns (address)",
  "function marketOf(address pool) view returns (uint256)",
  "function rulesRefOf(uint256 marketId) view returns (bytes32)",
  "function poolImplementation() view returns (address)",
  "function usdc() view returns (address)",
  "function resolver() view returns (address)",
  "event MarketCreated(uint256 indexed marketId, address indexed pool, address indexed creator, uint8 kind, uint8 resolution, bytes32 rulesRef, uint64 closeTime)",
]);

export const kizashiPoolAbi = parseAbi([
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
  "function winningBucket() view returns (uint256)",
  "function resolver() view returns (address)",
  "function creator() view returns (address)",
  "function quote(address owner, int256[] delta) view returns (Quote)",
  "function trade(int256[] delta, int256 limitUsdc, uint64 deadline) returns (Quote)",
  "function redeem() returns (int256 payoutWad, uint256 payoutUsdc)",
  "event Traded(address indexed owner, int256[] delta, int256 topUpWad, int256 chargeWad, int256 chargeUsdc)",
  "event Redeemed(address indexed owner, int256 payoutWad, uint256 paidUsdc)",
  "event Resolved(uint256 indexed bucket)",
  "event Closed(address indexed by)",
]);

export const kizashiResolverAbi = parseAbi([
  "function factory() view returns (address)",
  "function resolverRole() view returns (address)",
  "function markets(uint256 marketId) view returns (address pool, uint8 mode, uint8 status)",
  "function finalize(uint256 marketId)",
  "event Finalized(uint256 indexed marketId, uint256 bucket, uint8 path)",
  "event Proposed(uint256 indexed marketId, uint256 bucket, bytes32 evidenceRef, uint64 disputeEndsAt)",
  "event Disputed(uint256 indexed marketId, address indexed by, bytes32 reason)",
]);

export const erc20Abi = parseAbi([
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);
