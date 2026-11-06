import { expect, test } from "bun:test";
import { cn } from "./cn";

test("custom type sizes retain foreground colors", () => {
  expect(cn("text-accent-fg", "text-body")).toBe("text-accent-fg text-body");
  expect(cn("text-small", "text-text-muted")).toBe("text-small text-text-muted");
  expect(cn("text-body", "text-small")).toBe("text-small");
});
