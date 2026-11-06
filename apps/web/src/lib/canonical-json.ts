import { keccak256, stringToBytes } from "viem";

/** JSON with object keys sorted at every level and `undefined` dropped: one byte form per value. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = sortKeys(v);
    }
    return out;
  }
  return value;
}

/** The on-chain rulesRef for a metadata document: keccak256 of its canonical JSON bytes. */
export function rulesRefOf(bytes: Uint8Array): `0x${string}` {
  return keccak256(bytes);
}

export function canonicalBytes(value: unknown): Uint8Array {
  return stringToBytes(canonicalJson(value));
}
