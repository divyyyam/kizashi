"use client";
import { sigmaBounds } from "@kizashi/core";
import { useDeferredValue, useMemo, useState } from "react";
import { useStore } from "zustand";
import type { CurveParams } from "@/features/curve";
import type { DataState } from "@/lib/data-state";
import { createDraftStore } from "../lib/draft-store";
import type { MarketDetail, OwnerPosition } from "../types";
import { useQuote } from "./use-quote";
export function useBetWorkspace({
  market,
  position,
  connected,
  wrongNetwork,
}: {
  market: MarketDetail;
  position: DataState<OwnerPosition>;
  connected: boolean;
  wrongNetwork: boolean;
}) {
  const [store] = useState(() => createDraftStore(market));
  const draft = useStore(store);
  const scale = 10 ** market.precision;
  const grid = useMemo(
    () => ({
      lo: Number(market.grid.lo) / scale,
      width: Number(market.grid.w) / scale,
      count: market.grid.n,
      unit: market.unit,
      precision: market.precision,
    }),
    [market, scale],
  );
  const crowdPrices = useMemo(
    () => market.pricesWad.map((price) => Number(price) / 1e18),
    [market.pricesWad],
  );
  const value = { mean: Number(draft.mean) / scale, sigma: Number(draft.sigma) / scale };
  const onChange = (next: CurveParams) =>
    draft.patch({
      mean: BigInt(Math.round(next.mean * scale)),
      sigma: quantizeSigma(market, next.sigma * scale),
    });
  const deferredDraft = useDeferredValue(draft);
  const result = useQuote({ market, position, draft: deferredDraft });
  const quote = deferredDraft === draft ? result : { status: "loading" as const };
  const slip = { market, draft, store, quote, connected, wrongNetwork };
  const highlight =
    market.winningBucket !== undefined
      ? { fromBucket: market.winningBucket, toBucket: market.winningBucket + 1 }
      : draft.mode === "simple"
        ? {
            fromBucket: draft.direction === "above" ? draft.threshold : 0,
            toBucket: draft.direction === "above" ? market.grid.n : draft.threshold,
          }
        : undefined;
  return { grid, crowdPrices, value, onChange, highlight, slip, draft };
}

function quantizeSigma(market: MarketDetail, value: number): bigint {
  const { min, max } = sigmaBounds(market.grid);
  const rounded = BigInt(Math.max(1, Math.round(value)));
  // biome-ignore lint/complexity/useMathMinMax: Bigint bounds cannot use Math.min/max.
  return rounded < min ? min : rounded > max ? max : rounded;
}
