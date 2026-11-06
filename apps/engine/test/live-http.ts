// Live HTTP smoke against a running engine: SIWE sign-in, JSON rules upload, confirmRules
// resume, run readback and an on-demand tick. Without a key file it signs in with a throwaway
// wallet and moves no funds. With a funded key file (kept outside the repo) it also approves
// the planner's proposal, signs the trade from that wallet and posts the txHash back.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import type { Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";
import { signPendingTrade } from "./live-trade";

const [
  base = "http://127.0.0.1:8787",
  marketId = "3",
  keyFile,
  prompt = "Back the crowd's most likely bucket if the price is fair.",
] = process.argv.slice(2);
const origin = "http://localhost:3000";
const print = (...parts: unknown[]) => process.stdout.write(`${parts.map(String).join(" ")}\n`);
const privateKey = keyFile ? (readFileSync(keyFile, "utf8").trim() as Hex) : generatePrivateKey();
const account = privateKeyToAccount(privateKey);
const call = async (path: string, init: RequestInit = {}, token?: string) => {
  const headers = new Headers(init.headers);
  headers.set("Origin", origin);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  const body = await response.text();
  print(init.method ?? "GET", path, response.status, body.slice(0, 400));
  return { status: response.status, json: body ? JSON.parse(body) : null };
};

const health = await call("/health");
assert.equal(health.status, 200);
const nonce = await call("/auth/nonce");
const message = createSiweMessage({
  address: account.address,
  chainId: health.json.chainId,
  domain: new URL(origin).host,
  uri: origin,
  version: "1",
  nonce: nonce.json.nonce,
  issuedAt: new Date(),
});
const signature = await account.signMessage({ message });
const verified = await call("/auth/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ v: 1, message, signature }),
});
assert.equal(verified.status, 200);
const token = verified.json.token as string;
const nowSec = Math.floor(Date.now() / 1000);
const rules = {
  budgetUsdc: "1000000",
  perTradeCapUsdc: "250000",
  dailyCapUsdc: "500000",
  maxLossPerMarketUsdc: "500000",
  maxDrawdownUsdc: "500000",
  stopAtSec: nowSec + 6 * 3600,
  allowedMarketIds: [marketId],
  allowedShapes: ["binary", "curve"],
  notes: prompt,
};
const form = new FormData();
form.set("v", "1");
form.set("mode", "suggest");
form.set("prompt", prompt);
form.set("rules", new Blob([JSON.stringify(rules)], { type: "application/json" }), "rules.json");
const created = await call("/runs", { method: "POST", body: form }, token);
assert.equal(created.status, 201);
const runId = created.json.runId as string;
const pending = await call(`/runs/${runId}`, {}, token);
const rulesHash = pending.json.pending?.rulesHash ?? pending.json.pending?.payload?.rulesHash;
assert.ok(rulesHash, "confirmRules must be pending with a rules hash");
const bad = await call(
  `/runs/${runId}/resume`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ v: 1, kind: "confirmRules", rulesHash: `0x${"0".repeat(64)}` }),
  },
  token,
);
assert.equal(bad.json?.error?.code, "rules_hash_mismatch");
await call(
  `/runs/${runId}/resume`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ v: 1, kind: "confirmRules", rulesHash }),
  },
  token,
);
const tick = await call(
  `/runs/${runId}/tick`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ v: 1 }),
  },
  token,
);
print("runId", runId, "tick status", tick.status, "code", tick.json?.error?.code ?? "none");
if (keyFile) await signPendingTrade({ call, runId, token, privateKey, print });

const stream = await fetch(`${base}/runs/${runId}/stream`, {
  headers: { Authorization: `Bearer ${token}`, Origin: origin, Accept: "text/event-stream" },
  signal: AbortSignal.timeout(4000),
});
print("GET stream", stream.status, stream.headers.get("content-type"));
const reader = stream.body?.getReader();
let text = "";
try {
  while (reader && text.length < 2000) {
    const chunk = await reader.read();
    if (chunk.done) break;
    text += new TextDecoder().decode(chunk.value);
  }
} catch {
  // The stream stays open; the abort after four seconds ends the read.
}
const events = text
  .split("\n")
  .filter((line) => line.startsWith("event:") || line.startsWith("data:"));
print("stream events", events.length, events.slice(0, 6).join(" | "));
