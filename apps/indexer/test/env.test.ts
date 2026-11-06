import { describe, expect, it } from "bun:test";
import { parseEnv } from "../src/env";

describe("env", () => {
  const valid = {
    ARC_TESTNET_RPC_URL: "https://rpc.testnet.arc.network",
    ARKIV_RPC_URL: "https://rabdi.rpc.arkiv.network",
    INDEXER_ARKIV_PRIVATE_KEY: "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    LISTING_ARKIV_PRIVATE_KEY: "0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
  };

  it("parses valid env with defaults", () => {
    const env = parseEnv(valid);
    expect(env.ARC_CHAIN_ID).toBe(5042002);
    expect(env.INDEXER_POLL_MS).toBe(10000);
    expect(env.INDEXER_SNAPSHOT_MIN_SEC).toBe(60);
  });

  it("fails fast on missing variable with only the name", () => {
    expect(() =>
      parseEnv({
        ...valid,
        ARC_TESTNET_RPC_URL: "",
      }),
    ).toThrow("Missing or invalid environment variable: ARC_TESTNET_RPC_URL");
  });
});
