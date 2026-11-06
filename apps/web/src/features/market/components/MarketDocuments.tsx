import { DocumentPanel } from "./DocumentPanel";
export function MarketDocuments({ chainId, marketId }: { chainId: number; marketId: string }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {(["rules", "evidence"] as const).map((kind) => (
        <DocumentPanel key={kind} chainId={chainId} marketId={marketId} kind={kind} />
      ))}
    </div>
  );
}
