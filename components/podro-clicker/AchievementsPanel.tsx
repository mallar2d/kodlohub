"use client";

import { ACHIEVEMENTS, formatGrams } from "@/lib/podro-clicker/gameConfig";
import type { ClickerState } from "@/lib/podro-clicker/state";

interface AchievementsPanelProps {
  state: ClickerState;
}

export default function AchievementsPanel({ state }: AchievementsPanelProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {ACHIEVEMENTS.map((achievement) => {
        const unlocked = state.achievements.includes(achievement.id);
        return (
          <div
            key={achievement.id}
            className={`flex items-center gap-3 px-3 py-3 rounded border ${
              unlocked
                ? "border-on-primary-mute/40 bg-canvas-night-soft"
                : "border-hairline-dark/50 opacity-50"
            }`}
          >
            <span
              className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center ${
                unlocked ? "border-on-primary text-on-primary" : "border-hairline-dark text-ink-mute"
              }`}
            >
              {unlocked ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              )}
            </span>
            <span className="min-w-0">
              <span className={`block button-cap truncate ${unlocked ? "text-on-primary" : "text-ink-mute"}`}>
                {achievement.name}
              </span>
              <span className="block text-[11px] text-ink-mute truncate">
                {unlocked ? achievement.description : `${formatGrams(achievement.threshold)} г кави`}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
