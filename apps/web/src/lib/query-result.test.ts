import { describe, expect, it } from "bun:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { queryResult } from "./query-result";
import { RequestFailure } from "./request";

describe("query feedback", () => {
  it("keeps the last successful data when a refresh fails", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const key = ["positions", "owner-one"];
    client.setQueryData(key, ["held-position"]);
    const observer = new QueryObserver(client, {
      queryKey: key,
      enabled: false,
      queryFn: async (): Promise<string[]> => {
        throw new RequestFailure("network");
      },
    });
    const unsubscribe = observer.subscribe(() => undefined);
    try {
      await observer.refetch();
      const result = queryResult(observer.getCurrentResult(), "Could not refresh positions");
      expect(result.status).toBe("ready");
      if (result.status !== "ready") throw new Error("expected cached result");
      expect(result.data).toEqual(["held-position"]);
      expect(result.warning).toBeDefined();
      expect(result.retry).toBeFunction();
    } finally {
      unsubscribe();
      observer.destroy();
      client.clear();
    }
  });
  it("does not reuse another wallet’s cached data", () => {
    const client = new QueryClient();
    client.setQueryData(["positions", "owner-one"], ["private-position"]);
    const observer = new QueryObserver<string[]>(client, {
      queryKey: ["positions", "owner-two"],
      enabled: false,
    });
    const result = queryResult(observer.getCurrentResult(), "Could not load positions");
    expect(result.status).toBe("loading");
    expect("data" in result).toBe(false);
    observer.destroy();
    client.clear();
  });
});
