import { expect, test } from "bun:test";
import { callAdapter } from "../src/services/adapter-call";

test("a stalled adapter is aborted with a typed timeout rather than blocking a tick", async () => {
  let signal: AbortSignal | undefined;
  const result = callAdapter(
    (input) => {
      signal = input;
      return new Promise<never>(() => {});
    },
    "quote_drift",
    5,
  );
  await expect(result).rejects.toMatchObject({ code: "quote_drift", status: 503 });
  expect(signal?.aborted).toBe(true);
});

test("adapter diagnostics never escape as raw service errors", async () => {
  await expect(
    callAdapter(async () => {
      throw new Error("Private upstream diagnostics");
    }),
  ).rejects.toMatchObject({ code: "internal", message: "The engine data service is unavailable." });
});
