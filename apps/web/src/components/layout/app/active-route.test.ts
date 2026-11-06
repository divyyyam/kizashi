import { describe, expect, test } from "bun:test";
import { activeItem } from "./active-route";

const items = [{ href: "/markets" }, { href: "/markets/new" }, { href: "/portfolio" }];

describe("activeItem", () => {
  test("exact path", () => {
    expect(activeItem(items, "/portfolio")?.href).toBe("/portfolio");
  });
  test("longest prefix wins", () => {
    expect(activeItem(items, "/markets/new")?.href).toBe("/markets/new");
  });
  test("nested market detail keeps the lobby active", () => {
    expect(activeItem(items, "/markets/7")?.href).toBe("/markets");
  });
  test("prefix without a separator does not match", () => {
    expect(activeItem(items, "/marketsx")).toBeUndefined();
  });
  test("unknown path", () => {
    expect(activeItem(items, "/")).toBeUndefined();
  });
});
