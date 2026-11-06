import { crowdMedian, expressiveToSimple, simpleToExpressive } from "@kizashi/core";
import { createStore } from "zustand/vanilla";
import type { BetDraft, MarketDetail } from "../types";
import { initialDraft } from "./defaults";
export function createDraftStore(market: MarketDetail) {
  return createStore<
    BetDraft & {
      patch: (draft: Partial<BetDraft>) => void;
      switchMode: (mode: BetDraft["mode"], currentMarket?: MarketDetail) => void;
    }
  >()((set, get) => ({
    ...initialDraft(market),
    patch: (draft) => set(draft),
    switchMode: (mode, currentMarket = market) => {
      const draft = get();
      if (mode === draft.mode || market.kind === "binary") return;
      const mapped =
        mode === "simple"
          ? expressiveToSimple(
              market.grid,
              { mean: draft.mean, sigma: draft.sigma },
              crowdMedian(currentMarket.grid, currentMarket.pricesWad),
            )
          : simpleToExpressive(market.grid, draft);
      set({ ...mapped, mode });
    },
  }));
}
export type DraftStore = ReturnType<typeof createDraftStore>;
