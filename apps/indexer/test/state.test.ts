import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { loadState, saveState } from "../src/state";

const TEST_STATE_FILE = resolve(import.meta.dir, "./tmp-cursor.json");

describe("cursor resume", () => {
  beforeEach(() => {
    if (existsSync(TEST_STATE_FILE)) {
      rmSync(TEST_STATE_FILE);
    }
  });

  afterEach(() => {
    if (existsSync(TEST_STATE_FILE)) {
      rmSync(TEST_STATE_FILE);
    }
  });

  it("loads initial state with factory deployment block when file is missing", () => {
    const state = loadState(TEST_STATE_FILE);
    expect(state.cursorBlock).toBe(71016700n);
    expect(Object.keys(state.markets).length).toBeGreaterThanOrEqual(4);
    expect(state.markets["1"]?.poolAddress).toBeDefined();
  });

  it("resumes cursor and tracked markets after saving state", () => {
    const initial = loadState(TEST_STATE_FILE);
    initial.cursorBlock = 71050000n;
    initial.markets["99"] = {
      marketId: "99",
      poolAddress: "0x1234567890123456789012345678901234567890",
      status: "closed",
      lastSnapshotTsSec: 1793900000,
    };

    saveState(initial, TEST_STATE_FILE);

    const resumed = loadState(TEST_STATE_FILE);
    expect(resumed.cursorBlock).toBe(71050000n);
    expect(resumed.markets["99"]).toEqual({
      marketId: "99",
      poolAddress: "0x1234567890123456789012345678901234567890",
      status: "closed",
      lastSnapshotTsSec: 1793900000,
    });
  });
});
