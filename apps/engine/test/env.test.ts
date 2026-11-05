import { expect, test } from "bun:test";
import { readEnvironment } from "../src/env";

test("startup errors name missing fields without disclosing supplied values", () => {
  const secret = crypto.randomUUID();
  try {
    readEnvironment({ DATABASE_URL: secret, DIRECT_URL: secret, ENGINE_JWT_SECRET: secret });
    throw new Error("Invalid environment was accepted.");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    if (!(error instanceof Error)) throw error;
    expect(error.message).toContain("DATABASE_URL");
    expect(error.message).not.toContain(secret);
  }
});
