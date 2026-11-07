import { copy } from "@/content/copy";
import { useMarketDocument } from "../hooks/use-market-document";
export function DocumentPanel({
  chainId,
  marketId,
  kind,
}: {
  chainId: number;
  marketId: string;
  kind: "rules" | "evidence";
}) {
  const result = useMarketDocument({ chainId, marketId, kind });
  return (
    <section className="flex flex-col gap-4 rounded-md border p-6">
      <h2 className="text-h3">{copy.market[kind]}</h2>
      {result.status === "ready" ? (
        <>
          <p className="whitespace-pre-wrap break-words text-small text-text-muted">
            {result.data.text}
          </p>
          <a
            href={result.data.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center text-small underline"
          >
            {copy.market.document}
          </a>
        </>
      ) : (
        <p className="text-small text-text-muted">
          {result.status === "error"
            ? result.message
            : result.status === "unavailable"
              ? result.reason
              : copy.market.documentUnavailable}
        </p>
      )}
    </section>
  );
}
