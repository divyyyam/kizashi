import { expect, test } from "bun:test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";
import { createAuthService } from "../src/services/auth";
import { createTokenService, JWT_LIFETIME_SEC } from "../src/services/tokens";
import { memoryNonceStore } from "./fixtures/auth-store";

const CHAIN_ID = 31337;
const DOMAIN = "localhost:3000";
const ORIGIN = "http://localhost:3000";
const MILLISECONDS_PER_SECOND = 1000;

function fixture() {
  let now = new Date();
  const tokens = createTokenService(crypto.randomUUID() + crypto.randomUUID());
  const nonces = memoryNonceStore();
  const auth = createAuthService({
    nonces,
    tokens,
    domain: DOMAIN,
    origins: [ORIGIN],
    chainId: CHAIN_ID,
    now: () => now,
  });
  const account = privateKeyToAccount(generatePrivateKey());
  async function signed(overrides: { domain?: string; uri?: string; chainId?: number } = {}) {
    const { nonce } = await auth.nonce();
    const message = createSiweMessage({
      address: account.address,
      chainId: CHAIN_ID,
      domain: DOMAIN,
      uri: ORIGIN,
      version: "1",
      nonce,
      issuedAt: now,
      ...overrides,
    });
    return { v: 1 as const, message, signature: await account.signMessage({ message }) };
  }
  return {
    auth,
    tokens,
    account,
    signed,
    nowSec: () => Math.floor(now.getTime() / MILLISECONDS_PER_SECOND),
    advance: (seconds: number) => {
      now = new Date(now.getTime() + seconds * MILLISECONDS_PER_SECOND);
    },
  };
}

test("issues a five-minute nonce and a twelve-hour JWT for the signer", async () => {
  const { auth, tokens, account, signed, nowSec } = fixture();
  const nonce = await auth.nonce();
  expect(nonce.expiresAtSec - nowSec()).toBe(5 * 60);
  const result = await auth.verify(await signed());
  expect(result.address).toBe(account.address);
  expect(result.expiresAtSec - nowSec()).toBe(JWT_LIFETIME_SEC);
  expect(await tokens.verify(result.token)).toEqual({ sub: account.address, chainId: CHAIN_ID });
});
test.each([
  { domain: "invalid.example" },
  { uri: "http://invalid.example" },
  { uri: `${ORIGIN}/unexpected-path` },
  { chainId: 1 },
])("rejects wrong domain, origin, URI or chain: %j", async (override) => {
  const { auth, signed } = fixture();
  await expect(auth.verify(await signed(override))).rejects.toMatchObject({
    code: "unauthorized",
  });
});
test("rejects nonce replay, including concurrent verification", async () => {
  const { auth, signed } = fixture();
  const request = await signed();
  const results = await Promise.allSettled([auth.verify(request), auth.verify(request)]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  await expect(auth.verify(request)).rejects.toMatchObject({ code: "unauthorized" });
});
test("rejects expired nonces", async () => {
  const { auth, signed, advance } = fixture();
  const request = await signed();
  advance(5 * 60);
  await expect(auth.verify(request)).rejects.toMatchObject({ code: "unauthorized" });
});
test("rejects another wallet's signature and malformed messages", async () => {
  const { auth, signed } = fixture();
  const request = await signed();
  const other = privateKeyToAccount(generatePrivateKey());
  const signature = await other.signMessage({ message: request.message });
  await expect(auth.verify({ ...request, signature })).rejects.toMatchObject({
    code: "unauthorized",
  });
  await expect(auth.verify({ ...request, message: "invalid" })).rejects.toMatchObject({
    code: "unauthorized",
  });
});
test("rejects expired JWTs and a different signing key", async () => {
  const { tokens, account } = fixture();
  const expired = await tokens.issue({ sub: account.address, chainId: CHAIN_ID }, 0);
  await expect(tokens.verify(expired)).rejects.toMatchObject({ code: "unauthorized" });
  const token = await tokens.issue(
    { sub: account.address, chainId: CHAIN_ID },
    Math.floor(Date.now() / MILLISECONDS_PER_SECOND),
  );
  await expect(createTokenService(crypto.randomUUID()).verify(token)).rejects.toMatchObject({
    code: "unauthorized",
  });
});
