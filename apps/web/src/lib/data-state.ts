/** Result union every data hook returns (docs/ui/RULES.md §4). */
export type DataState<T> =
  | { readonly status: "loading" }
  | { readonly status: "empty" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly data: T }
  | { readonly status: "unavailable"; readonly reason: string };
