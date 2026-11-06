import { readFileSync } from "node:fs";
import { join } from "node:path";

/** contracts/test/vectors/golden.json, the F-CP3 oracle vectors. */
export type Case = Record<string, unknown> & { id: string };
export const golden = JSON.parse(
  readFileSync(join(import.meta.dir, "../../../contracts/test/vectors/golden.json"), "utf8"),
) as Record<string, Case[]> & { counts: Record<string, string>; total: string };

export const big = (c: Case, key: string): bigint => BigInt(c[key] as string);
export const bigs = (c: Case, key: string): bigint[] => (c[key] as string[]).map((x) => BigInt(x));
export const num = (c: Case, key: string): number => Number(c[key]);

export const parity = JSON.parse(
  readFileSync(join(import.meta.dir, "fixtures/solidity-parity.json"), "utf8"),
) as Record<string, Record<string, string>>;
