import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAddress } from "viem";
import {
  DEPLOYMENT_5042002,
  deploymentByChainId,
  factoryAddress,
  resolverAddress,
} from "../src/deployments";

describe("deployments", () => {
  it("matches contracts/deployments/5042002.json", () => {
    const raw = JSON.parse(
      readFileSync(join(__dirname, "../../../contracts/deployments/5042002.json"), "utf8"),
    );
    expect(DEPLOYMENT_5042002.marketFactory.address).toBe(
      getAddress(raw.KizashiMarketFactory.address),
    );
    expect(DEPLOYMENT_5042002.resolver.address).toBe(getAddress(raw.KizashiResolver.address));
    expect(DEPLOYMENT_5042002.poolImplementation.address).toBe(
      getAddress(raw.KizashiPoolImplementation.address),
    );
    expect(DEPLOYMENT_5042002.usdc.address).toBe(getAddress(raw.USDC.address));

    for (const [id, m] of Object.entries(raw.markets as Record<string, { pool: string }>)) {
      const deployed = DEPLOYMENT_5042002.markets[id];
      expect(deployed).toBeDefined();
      expect(deployed?.pool).toBe(getAddress(m.pool));
    }
  });

  it("exposes lookup helpers", () => {
    expect(deploymentByChainId(5042002)?.chainId).toBe(5042002);
    expect(factoryAddress(5042002)).toBe(DEPLOYMENT_5042002.marketFactory.address);
    expect(resolverAddress(5042002)).toBe(DEPLOYMENT_5042002.resolver.address);
    expect(deploymentByChainId(999999)).toBeUndefined();
  });
});
