"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { isRateLimited, retryRead } from "@/lib/request";

/** Public reads survive route-group navigation; wallet providers remain inside the app. */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: retryRead,
            retryDelay: 1000,
            staleTime: 10_000,
            networkMode: "always",
            refetchOnWindowFocus: (query) => !isRateLimited(query.state.error),
          },
          mutations: { retry: false },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
