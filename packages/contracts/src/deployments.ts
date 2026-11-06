import type { Address } from "viem";
import { getAddress } from "viem";
import { arcTestnet } from "./chains";

export type DeployedRecord = {
  address: Address;
  block: bigint;
};

export type DeployedMarket = {
  pool: Address;
  kind: "binary" | "curve";
  resolution: "manual" | "twap";
  n: number;
  lo: number;
  w: number;
  closeTime: number;
  rulesRef: `0x${string}`;
  block?: bigint;
};

export type Deployment = {
  chainId: number;
  marketFactory: DeployedRecord;
  resolver: DeployedRecord;
  poolImplementation: DeployedRecord;
  usdc: DeployedRecord;
  markets: Record<string, DeployedMarket>;
  /** Uniswap v4 pool watched by KizashiOracleHook, usable for TWAP-resolved markets. */
  twap?: {
    hook: Address;
    baseToken: Address;
    baseSymbol: string;
    baseDecimals: number;
    quoteDecimals: number;
    key: {
      currency0: Address;
      currency1: Address;
      fee: number;
      tickSpacing: number;
      hooks: Address;
    };
    baseIsToken0: boolean;
    window: number;
    minObservations: number;
    minLiquidity: bigint;
  };
};

export const DEPLOYMENT_5042002: Deployment = {
  chainId: arcTestnet.id,
  marketFactory: {
    address: getAddress("0x9220ff4A3E8239E05592c8DD6203DF3eD277C756"),
    block: 71016700n,
  },
  resolver: {
    address: getAddress("0xf8E601C93Fd1d98833E24d578410FDaaA69A5A70"),
    block: 71016700n,
  },
  poolImplementation: {
    address: getAddress("0x494202DCD3094B576C9B34B0bB74be97E333CEab"),
    block: 71016700n,
  },
  usdc: {
    address: getAddress("0x3600000000000000000000000000000000000000"),
    block: 71016700n,
  },
  twap: {
    hook: getAddress("0xDC01d60Ac4a389FD3Cf84959A8fc1e7EDcACd040"),
    baseToken: getAddress("0x293D9e82fe0f3bDe07164D0EDfAE19eCd33E09dc"),
    baseSymbol: "KZT",
    baseDecimals: 18,
    quoteDecimals: 6,
    key: {
      currency0: getAddress("0x293D9e82fe0f3bDe07164D0EDfAE19eCd33E09dc"),
      currency1: getAddress("0x3600000000000000000000000000000000000000"),
      fee: 3000,
      tickSpacing: 60,
      hooks: getAddress("0xDC01d60Ac4a389FD3Cf84959A8fc1e7EDcACd040"),
    },
    baseIsToken0: true,
    window: 300,
    minObservations: 10,
    minLiquidity: 1_000_000_000_000n,
  },
  markets: {
    "1": {
      pool: getAddress("0x7467FE96C4C350D83F7c7720477c22155fEEb393"),
      kind: "curve",
      resolution: "manual",
      n: 16,
      lo: 130,
      w: 2,
      closeTime: 1793969502,
      rulesRef: "0xb8d81e61c0396a5b2377eefeec387db155ad9c0685e33caa2e231bacf6d14da6",
    },
    "2": {
      pool: getAddress("0xC05bA222BC16b58E7EBF3Fe797DE6Ed492684A21"),
      kind: "curve",
      resolution: "twap",
      n: 8,
      lo: 50,
      w: 25,
      closeTime: 1793969502,
      rulesRef: "0x4418ac010ba488047a9d341632bf9b8a59d5f79d070dd84c874da67d4550d716",
    },
    "3": {
      pool: getAddress("0x71Ce3111664DA28A62137cECF708f11CF15f372F"),
      kind: "curve",
      resolution: "manual",
      n: 16,
      lo: 130,
      w: 2,
      closeTime: 1794119400,
      rulesRef: "0x6e66654e1cbb373456d390548b1c857a7e47f185689c9fc642f0f65cb1e2658c",
      block: 71031897n,
    },
    "4": {
      pool: getAddress("0xC5904fAC9d4263E5Fa3C47603C5B5dee719bcAD9"),
      kind: "binary",
      resolution: "manual",
      n: 2,
      lo: 130,
      w: 16,
      closeTime: 1794033000,
      rulesRef: "0x4d49bdaa82806ffa0b39412e38f956de298c0f180028fb45f0d5e8e3d30dca9f",
      block: 71035905n,
    },
  },
};

export const DEPLOYMENTS: Readonly<Record<number, Deployment>> = {
  [arcTestnet.id]: DEPLOYMENT_5042002,
};

export function deploymentByChainId(chainId: number): Deployment | undefined {
  return DEPLOYMENTS[chainId];
}

export function factoryAddress(chainId: number): Address | undefined {
  return DEPLOYMENTS[chainId]?.marketFactory.address;
}

export function resolverAddress(chainId: number): Address | undefined {
  return DEPLOYMENTS[chainId]?.resolver.address;
}

export function poolImplementationAddress(chainId: number): Address | undefined {
  return DEPLOYMENTS[chainId]?.poolImplementation.address;
}
