import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { RequestFailure, rateLimitRetryAt } from "./request";
import { createRpcRateGuard } from "./rpc-rate-guard";

afterEach(() => mock.restore());
describe("RPC cooldown", () => {
  it("honours Retry-After and blocks other widgets before they hit the provider", () => {
    const clock = spyOn(Date, "now").mockReturnValue(1000);
    const guard = createRpcRateGuard();
    expect(() =>
      guard.onFetchResponse(new Response(null, { status: 429, headers: { "retry-after": "10" } })),
    ).toThrow(RequestFailure);
    expect(() => guard.onFetchRequest()).toThrow(RequestFailure);
    try {
      guard.onFetchRequest();
    } catch (error) {
      expect(rateLimitRetryAt(error, 5000)).toBe(11000);
    }
    clock.mockReturnValue(11001);
    expect(() => guard.onFetchRequest()).not.toThrow();
  });
  it("uses the cooldown for a 429 without headers and ignores successful reads", () => {
    spyOn(Date, "now").mockReturnValue(1000);
    const guard = createRpcRateGuard();
    guard.onFetchResponse(new Response(null, { status: 200 }));
    expect(() => guard.onFetchRequest()).not.toThrow();
    expect(() => guard.onFetchResponse(new Response(null, { status: 429 }))).toThrow(
      RequestFailure,
    );
    expect(() => guard.onFetchRequest()).toThrow(RequestFailure);
  });
});
