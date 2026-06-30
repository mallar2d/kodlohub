"use client";

import { HELPERS, formatGrams } from "@/lib/podro-clicker/gameConfig";
import type { HelperId } from "@/lib/podro-clicker/gameConfig";
import { canAffordHelper, getHelperPrice, type ClickerState } from "@/lib/podro-clicker/state";

interface HelperShopProps {
  state: ClickerState;
  onBuy: (id: HelperId) => void;
}

export default function HelperShop({ state, onBuy }: HelperShopProps) {
  return (
    <div className="flex flex-col gap-2">
      {HELPERS.map((helper, idx) => {
        const owned = state.helpers[helper.id] ?? 0;
        const price = getHelperPrice(state, helper.id);
        const affordable = canAffordHelper(state, helper.id);
        return (
          <button
            key={helper.id}
            type="button"
            onClick={() => onBuy(helper.id)}
            disabled={!affordable}
            className={`group flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded border text-left transition-colors ${
              affordable
                ? "border-hairline-dark hover:border-on-primary-mute cursor-pointer bg-canvas-night-soft"
                : "border-hairline-dark/50 cursor-not-allowed opacity-50"
            }`}
          >
            <span className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-hairline-dark flex items-center justify-center font-[var(--font-display)] font-black text-xs text-on-primary-mute">
              {idx + 1}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block button-cap text-on-primary truncate">{helper.name}</span>
              <span className="block text-[11px] text-ink-mute truncate">{helper.flavor}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-on-primary-mute text-[11px] micro-cap">
                {owned > 0 ? `× ${owned}` : ""}
              </span>
              <span className="block font-[var(--font-display)] font-black text-on-primary text-sm tabular-nums">
                {formatGrams(price)} г
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
