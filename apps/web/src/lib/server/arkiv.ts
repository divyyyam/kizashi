import {
  type ArkivReader,
  type ArkivWriter,
  arkivConfigFromEnv,
  createArkivReader,
  createArkivWriter,
} from "@kizashi/arkiv";
import { type Address, isHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * The D10 listing service: one Arkiv wallet that signs every market listing and records the real
 * creator as an attribute. Writes from this process go through one queue (one signer, one nonce).
 */

type Ready<T> = { status: "ready"; value: T } | { status: "unavailable"; reason: string };

export function arkivServerReader(): Ready<ArkivReader> {
  const cfg = arkivConfigFromEnv(process.env);
  if (cfg.status !== "ready") return { status: "unavailable", reason: cfg.reason };
  return { status: "ready", value: createArkivReader(cfg.config) };
}

let writer: { client: ArkivWriter; address: Address } | undefined;

export function listingWriter(): Ready<{ client: ArkivWriter; address: Address }> {
  if (writer) return { status: "ready", value: writer };
  const cfg = arkivConfigFromEnv(process.env);
  if (cfg.status !== "ready") return { status: "unavailable", reason: cfg.reason };
  const key = process.env.LISTING_ARKIV_PRIVATE_KEY?.trim();
  if (!key || !isHex(key) || key.length !== 66)
    return { status: "unavailable", reason: "LISTING_ARKIV_PRIVATE_KEY is not set" };
  const account = privateKeyToAccount(key);
  writer = {
    client: createArkivWriter({ ...cfg.config, account, timeoutMs: 60_000 }),
    address: account.address,
  };
  return { status: "ready", value: writer };
}

export function listingWriterAddress(): Address | undefined {
  const fromEnv = process.env.NEXT_PUBLIC_ARKIV_LISTING_WRITER?.trim();
  return fromEnv && /^0x[0-9a-fA-F]{40}$/.test(fromEnv) ? (fromEnv as Address) : undefined;
}

let queue: Promise<unknown> = Promise.resolve();

/** Serialises Arkiv writes from this process. */
export function serialised<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}
