/** Result union every data hook returns (docs/ui/RULES.md §4). */
export type DataFeedback = {
  readonly retry?: () => void;
  readonly refreshing?: boolean;
  readonly warning?: string;
  readonly retryAt?: number;
};

export type DataState<T> = (
  | { readonly status: "loading" }
  | { readonly status: "empty" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly data: T }
  | { readonly status: "unavailable"; readonly reason: string }
) &
  DataFeedback;
