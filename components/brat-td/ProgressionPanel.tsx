/**
 * Progression panel — shows player level, XP progress, tower unlock grid.
 *
 * Extracted from BratTDClient.tsx (Task 12).
 */

import React from "react";
import { ACHIEVEMENTS, GAME_VERSION, TOWER_CONFIGS, TOWER_UNLOCK_LEVELS } from "@/app/(main)/tools/brat-td/gameConfig";
import { getPlayerLevelProgress } from "@/app/(main)/tools/brat-td/gameConfig";
import { isTowerUnlocked } from "@/lib/brat-td/progression-actions";
import type { ProgressionState } from "@/lib/brat-td/types";

export interface ProgressionPanelProps {
  progression: ProgressionState;
}

export function ProgressionPanel({ progression }: ProgressionPanelProps) {
  const levelProgress = getPlayerLevelProgress(progression.totalXp);
  const nextTower = Object.entries(TOWER_UNLOCK_LEVELS)
    .filter(
      ([towerType, level]) =>
        level > progression.playerLevel && TOWER_CONFIGS[towerType]
    )
    .sort((a, b) => a[1] - b[1])[0];
  return (
    <div className="card-dark p-4 border-hairline-dark">
      <div className="flex items-center justify-between mb-2">
        <p className="micro-cap text-ink-mute">ПРОГРЕСІЯ</p>
        <span className="text-xs font-bold text-cyan-300">
          v{GAME_VERSION} · LVL {progression.playerLevel}
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded overflow-hidden mb-2">
        <div
          className="h-full bg-cyan-400"
          style={{
            width: `${
              levelProgress.nextRequirement > 0
                ? Math.min(
                    100,
                    (levelProgress.currentXp / levelProgress.nextRequirement) * 100
                  )
                : 100
            }%`,
          }}
        />
      </div>
      <p className="text-[11px] text-on-primary-mute mb-2">
        XP: {Math.floor(levelProgress.currentXp)} /{" "}
        {levelProgress.nextRequirement || "MAX"}
      </p>
      <div className="flex flex-wrap gap-1 mb-2">
        {Object.entries(TOWER_CONFIGS)
          .sort(
            (a, b) =>
              (TOWER_UNLOCK_LEVELS[a[0]] ?? 0) - (TOWER_UNLOCK_LEVELS[b[0]] ?? 0)
          )
          .map(([towerType, cfg]) => (
            <span
              key={towerType}
              className={`inline-flex h-6 w-6 items-center justify-center rounded border ${
                isTowerUnlocked(towerType, progression)
                  ? "border-cyan-800 bg-cyan-950/30"
                  : "border-hairline-dark bg-black/30 opacity-40"
              }`}
              title={`${cfg.name}${
                isTowerUnlocked(towerType, progression)
                  ? ""
                  : ` · LVL ${TOWER_UNLOCK_LEVELS[towerType]}`
              }`}
            >
              <span
                className="h-3 w-3 rounded-sm border border-white/20"
                style={{ backgroundColor: cfg.color }}
              />
            </span>
          ))}
      </div>
      {nextTower && (
        <p className="text-[11px] text-ink-mute">
          Наступна вежа: {TOWER_CONFIGS[nextTower[0]].name} на LVL {nextTower[1]}
        </p>
      )}
      <p className="text-[11px] text-yellow-400 mt-2">
        Бонус старту: +{progression.bonusStartGold} GOLD / +
        {progression.bonusLives} HP
      </p>
      <p className="text-[11px] text-ink-mute mt-1">
        Досягнення: {progression.achievements.length}/{ACHIEVEMENTS.length}
      </p>
    </div>
  );
}
