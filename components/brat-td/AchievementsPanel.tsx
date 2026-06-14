/**
 * Achievements panel — list of all achievements with locked/unlocked state.
 *
 * Extracted from BratTDClient.tsx (Task 12).
 */

import React from "react";
import { ACHIEVEMENTS } from "@/app/(main)/tools/brat-td/gameConfig";
import { formatAchievementReward } from "@/lib/brat-td/progression-actions";
import type { ProgressionState } from "@/lib/brat-td/types";

export interface AchievementsPanelProps {
  progression: ProgressionState;
}

export function AchievementsPanel({ progression }: AchievementsPanelProps) {
  return (
    <div className="card-dark p-4 border-hairline-dark">
      <div className="flex items-center justify-between mb-3">
        <p className="micro-cap text-ink-mute">ДОСЯГНЕННЯ</p>
        <span className="text-[10px] text-cyan-300 font-bold">
          {progression.achievements.length}/{ACHIEVEMENTS.length}
        </span>
      </div>
      <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
        {ACHIEVEMENTS.map((achievement) => {
          const unlocked = progression.achievements.includes(achievement.id);
          return (
            <div
              key={achievement.id}
              className={`rounded border px-2.5 py-2 text-xs transition-colors ${
                unlocked
                  ? "border-cyan-800 bg-cyan-950/25 text-on-primary"
                  : "border-hairline-dark bg-black/25 text-on-primary-mute opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-bold text-on-primary">
                  {unlocked ? "🏆" : "🔒"} {achievement.name}
                </span>
                <span
                  className={`shrink-0 text-[10px] micro-cap ${
                    unlocked ? "text-cyan-300" : "text-ink-mute"
                  }`}
                >
                  {unlocked ? "OPEN" : "LOCKED"}
                </span>
              </div>
              <p className="leading-snug">{achievement.description}</p>
              <p className="mt-1 text-[10px] text-yellow-400 leading-snug">
                {formatAchievementReward(achievement.reward)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
