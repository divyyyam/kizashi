import { type RuleSet, ruleSetSchema } from "@kizashi/schemas/engine";
import { keccak256, stringToHex } from "viem";

type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | bigint
  | CanonicalValue[]
  | {
      [key: string]: CanonicalValue;
    };

export function canonicalJson(value: CanonicalValue): string {
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error("Canonical JSON requires finite numbers.");
  }
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => {
      const item = value[key];
      if (item === undefined) throw new Error("Canonical JSON cannot contain undefined values.");
      return `${JSON.stringify(key)}:${canonicalJson(item)}`;
    })
    .join(",")}}`;
}

export function rulesHash(input: RuleSet) {
  const rules = ruleSetSchema.parse(input);
  return keccak256(stringToHex(canonicalJson(rules)));
}
