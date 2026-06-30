"use client";

import { useState } from "react";
import { PRESTIGE_THRESHOLD, RESPECT_MULTIPLIER_PER_POINT, formatGrams } from "@/lib/podro-clicker/gameConfig";
import { canPrestige, getPendingRespectGain, getPrestigeMultiplier, type ClickerState } from "@/lib/podro-clicker/state";

interface PrestigePanelProps {
  state: ClickerState;
  onPrestige: () => void;
}

export default function PrestigePanel({ state, onPrestige }: PrestigePanelProps) {
  const [confirming, setConfirming] = useState(false);
  const able = canPrestige(state);
  const pendingGain = getPendingRespectGain(state);
  const currentMultiplier = getPrestigeMultiplier(state);
  const progressPct = Math.min(100, (state.careerGrams / PRESTIGE_THRESHOLD) * 100);

  return (
    <div className="card-dark p-5">
      <p className="micro-cap text-ink-mute mb-3">ШЕМЕТУВАННЯ (ПРЕСТИЖ)</p>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-[var(--font-display)] font-black text-2xl text-on-primary">
          {state.respectPoints.toLocaleString("uk-UA")}
        </span>
        <span className="text-on-primary-mute text-sm">ПОВАГИ</span>
      </div>
      <p className="text-on-primary-mute text-xs mb-4">
        Перманентний множник усієї продукції:{" "}
        <span className="text-on-primary font-bold">
          x{currentMultiplier.toFixed(2)}
        </span>{" "}
        (+{(RESPECT_MULTIPLIER_PER_POINT * 100).toFixed(0)}% за кожну повагу)
      </p>

      {!able ? (
        <>
          <div className="w-full h-1.5 rounded-full bg-canvas-night-soft overflow-hidden mb-2">
            <div
              className="h-full bg-on-primary-mute transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-ink-mute text-[11px]">
            Зароби {formatGrams(PRESTIGE_THRESHOLD)} г за все життя, щоб відкрити шеметування.
            Зараз: {formatGrams(state.careerGrams)} г.
          </p>
        </>
      ) : confirming ? (
        <div className="flex flex-col gap-2">
          <p className="text-on-primary text-sm">
            Ти скинеш поточних помічників і апгрейди, але отримаєш{" "}
            <span className="font-bold">+{pendingGain} ПОВАГИ</span> назавжди. Точно
            хочеш стати шеметованим знову?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onPrestige();
                setConfirming(false);
              }}
              className="btn-ghost text-on-primary flex-1"
            >
              ТАК, ШЕМЕТУЮСЯ
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="btn-ghost text-ink-mute flex-1"
            >
              НІ, ЩЕ ПОВАРЮ
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="btn-ghost text-on-primary w-full"
        >
          ШЕМЕТУВАТИСЯ (+{pendingGain} ПОВАГИ)
        </button>
      )}
    </div>
  );
}
