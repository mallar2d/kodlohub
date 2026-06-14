/**
 * AchievementToastStack — fixed-position stack of recently-unlocked
 * achievement toasts in the top-right of the screen.
 *
 * Extracted from BratTDClient.tsx (Task 12).
 */

import React from "react";
import type { AchievementToast } from "@/lib/brat-td/types";

export interface AchievementToastStackProps {
  toasts: AchievementToast[];
}

export function AchievementToastStack({ toasts }: AchievementToastStackProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-zinc-900/95 border border-cyan-500/40 rounded p-3 shadow-lg shadow-cyan-950/30 animate-slide-up min-w-[220px] max-w-[280px]"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🏆</span>
            <span className="text-xs font-bold text-cyan-300 micro-cap">Досягнення відкрито</span>
          </div>
          <p className="text-sm font-bold text-on-primary">{toast.name}</p>
          <p className="text-[11px] text-on-primary-mute leading-snug">{toast.description}</p>
          <p className="text-[10px] text-yellow-400 mt-1">{toast.reward}</p>
        </div>
      ))}
    </div>
  );
}
