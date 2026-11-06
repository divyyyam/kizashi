"use client";

import { useState } from "react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { formatWad } from "@/lib/format";
import {
  NETTING_EXAMPLE_IDS,
  NETTING_EXAMPLES,
  type NettingExampleId,
  summarise,
} from "../lib/netting-examples";
import { NettingBars } from "./NettingBars";

const text = copy.landing.netting;

/** Pick an accounting example; its tickets, G, N and F are computed with @kizashi/core. */
export function NettingExample() {
  const [id, setId] = useState<NettingExampleId>("offset");
  const tickets = NETTING_EXAMPLES[id];
  const summary = summarise(tickets);

  return (
    <div
      data-reveal
      className="grid overflow-hidden rounded-xl border border-border lg:grid-cols-5"
    >
      <div className="flex flex-col gap-6 border-border bg-surface p-6 max-lg:border-b lg:col-span-2 lg:border-r md:p-8">
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">{text.cases}</legend>
          {NETTING_EXAMPLE_IDS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === id}
              onClick={() => setId(option)}
              className={cn(
                "h-10 rounded-full border px-4 text-small transition-colors duration-120",
                option === id
                  ? "border-text bg-text text-bg"
                  : "border-border text-text-muted hover:border-border-strong hover:text-text",
              )}
            >
              {text.examples[option]}
            </button>
          ))}
        </fieldset>
        <TicketTable tickets={tickets} />
      </div>
      <div className="flex flex-col justify-between gap-8 p-6 lg:col-span-3 md:p-8">
        <NettingBars summary={summary} />
        <p className="text-small text-text-faint">{text.caption}</p>
      </div>
    </div>
  );
}

function TicketTable({ tickets }: { readonly tickets: readonly (readonly bigint[])[] }) {
  const buckets = tickets[0]?.length ?? 0;
  return (
    <table className="w-full text-small">
      <caption className="pb-3 text-left text-label text-text-faint">{text.tickets}</caption>
      <thead>
        <tr className="border-b border-border">
          <th scope="col" className="sr-only">
            {text.tickets}
          </th>
          {Array.from({ length: buckets }, (_, i) => (
            <th
              key={text.bucket(i)}
              scope="col"
              className="py-2 text-right font-normal text-text-muted"
            >
              {text.bucket(i)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tickets.map((ticket, row) => (
          <tr key={ticket.join(":")} className="border-b border-border last:border-b-0">
            <th scope="row" className="py-3 text-left font-mono font-normal text-text-faint">
              {row + 1}
            </th>
            {ticket.map((value, i) => (
              <td
                key={text.bucket(i)}
                className={cn(
                  "tabular py-3 text-right",
                  value < 0n ? "text-negative" : "text-text",
                )}
              >
                {formatWad(value)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
