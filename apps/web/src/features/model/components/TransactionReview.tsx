import type { txNeededSchema } from "@kizashi/schemas/engine";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { workspaceCopy as text } from "@/content/model-workspace-copy";
import { env } from "@/lib/env";
import { txUrl } from "@/lib/explorer";
import type { EngineSession } from "../hooks/use-engine-session";
import { useEngineTrade } from "../hooks/use-engine-trade";

export function TransactionReview({
  pending,
  session,
}: {
  pending: z.infer<typeof txNeededSchema>;
  session: EngineSession;
}) {
  const trade = useEngineTrade(pending.tradeId);
  const approval = [...session.state.events]
    .reverse()
    .find((event) => event.type === "approval_needed" && event.data.tradeId === pending.tradeId);
  const href = trade.hash ? txUrl(env.NEXT_PUBLIC_CHAIN_ID, trade.hash) : null;
  const busy = trade.busy || session.state.busy;
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-signal bg-surface p-5">
      <h2 className="text-h3 text-text">{text.approved}</h2>
      <p className="text-small text-text-muted">{text.signatureHelp}</p>
      {approval?.type === "approval_needed" ? (
        <Button
          type="button"
          disabled={busy || !trade.ready || session.state.stopped}
          className="self-start"
          onClick={() =>
            void trade.sign(approval.data, pending, (txHash) =>
              session.resume({ v: 1, kind: "userTx", tradeId: pending.tradeId, txHash }),
            )
          }
        >
          {busy ? text.busy : trade.hash ? text.submitReceipt : text.signTrade}
        </Button>
      ) : (
        <p className="text-small text-warning">{text.walletUnavailable}</p>
      )}
      {trade.hash ? (
        <p className="text-small text-text-muted">
          {text.tradePending}{" "}
          {href ? (
            <a href={href} target="_blank" rel="noreferrer" className="text-signal underline">
              {text.receipt}
            </a>
          ) : (
            <span className="break-all">{trade.hash}</span>
          )}
        </p>
      ) : null}
      {trade.error ? (
        <p role="alert" className="text-small text-warning">
          {trade.error}
        </p>
      ) : null}
      {!trade.hash ? (
        <Button
          type="button"
          variant="secondary"
          className="self-start"
          disabled={busy}
          onClick={() =>
            void session.resume({ v: 1, kind: "userTx", tradeId: pending.tradeId, cancelled: true })
          }
        >
          {text.cancelTrade}
        </Button>
      ) : null}
    </section>
  );
}
