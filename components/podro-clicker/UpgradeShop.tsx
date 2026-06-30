"use client";

import { UPGRADES, formatGrams } from "@/lib/podro-clicker/gameConfig";
import { isUpgradeVisible, type ClickerState } from "@/lib/podro-clicker/state";

interface UpgradeShopProps {
  state: ClickerState;
  onBuy: (id: string) => void;
}

export default function UpgradeShop({ state, onBuy }: UpgradeShopProps) {
  const visible = UPGRADES.filter((u) => isUpgradeVisible(state, u.id)).sort((a, b) => a.cost - b.cost);

  if (visible.length === 0) {
    return (
      <p className="text-on-primary-mute text-sm py-6 text-center">
        Поки немає доступних апгрейдів. Купуй помічників і варИ більше кави, кодло.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {visible.map((upgrade) => {
        const affordable = state.grams >= upgrade.cost;
        return (
          <button
            key={upgrade.id}
            type="button"
            onClick={() => onBuy(upgrade.id)}
            disabled={!affordable}
            className={`group flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded border text-left transition-colors ${
              affordable
                ? "border-hairline-dark hover:border-on-primary-mute cursor-pointer bg-canvas-night-soft"
                : "border-hairline-dark/50 cursor-not-allowed opacity-50"
            }`}
          >
            <span className="flex-1 min-w-0">
              <span className="block button-cap text-on-primary truncate">{upgrade.name}</span>
              <span className="block text-[11px] text-ink-mute truncate">{upgrade.description}</span>
            </span>
            <span className="shrink-0 font-[var(--font-display)] font-black text-on-primary text-sm tabular-nums">
              {formatGrams(upgrade.cost)} г
            </span>
          </button>
        );
      })}
    </div>
  );
}
