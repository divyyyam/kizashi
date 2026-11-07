import type { UseQueryResult } from "@tanstack/react-query";
import type { DataState } from "./data-state";
import { isRateLimited, rateLimitRetryAt, requestMessage } from "./request";

/** A failed background refresh keeps this query's last result, never another query's data. */
export function queryResult<T>(query: UseQueryResult<T, Error>, message: string): DataState<T> {
  const feedback = {
    retry: () => {
      void query.refetch({ cancelRefetch: true });
    },
    refreshing: query.isFetching,
    ...(isRateLimited(query.error)
      ? { retryAt: rateLimitRetryAt(query.error, query.errorUpdatedAt) }
      : {}),
  };
  if (query.data !== undefined)
    return {
      status: "ready",
      data: query.data,
      ...feedback,
      ...(query.isError ? { warning: requestMessage(query.error, message) } : {}),
    };
  if (query.isError)
    return {
      status: "error",
      message: requestMessage(query.error, message),
      ...feedback,
    };
  return { status: "loading", ...feedback };
}
