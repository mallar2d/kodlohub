/**
 * Map + difficulty selector grid shown on the idle (pre-game) screen.
 *
 * Extracted from BratTDClient.tsx (Task 12).
 */

import React from "react";
import { MAP_CONFIGS } from "@/lib/brat-td/maps";
import { DIFFICULTY_CONFIG } from "@/lib/brat-td/pure";
import type { DifficultyKey, MapConfig, ProgressionState } from "@/lib/brat-td/types";

export interface MapSelectorProps {
  selectedMapId: string;
  onSelectMap: (id: string) => void;
  difficulty: DifficultyKey;
  onSelectDifficulty: (key: DifficultyKey) => void;
  progression: ProgressionState;
}

export function MapSelector({
  selectedMapId,
  onSelectMap,
  difficulty,
  onSelectDifficulty,
  progression,
}: MapSelectorProps) {
  return (
    <>
      <div className="mb-4 grid w-full max-w-2xl gap-2 sm:grid-cols-3">
        {MAP_CONFIGS.map((map: MapConfig) => {
          const completions = progression.mapCompletions[map.id] ?? [];
          const isSelected = selectedMapId === map.id;
          return (
            <button
              key={map.id}
              onClick={() => onSelectMap(map.id)}
              className={`rounded border p-3 text-left transition-colors ${
                isSelected
                  ? "border-cyan-400 bg-cyan-950/40"
                  : "border-hairline-dark bg-black/30 hover:border-on-primary-mute"
              }`}
            >
              <span className="block text-xs font-bold text-on-primary">{map.name}</span>
              <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-cyan-300">
                {map.difficultyLabel}
              </span>
              <span className="mt-1 block min-h-10 text-[10px] leading-tight text-ink-mute">
                {map.description}
              </span>
              <span className="mt-2 flex flex-wrap gap-1">
                {(Object.keys(DIFFICULTY_CONFIG) as DifficultyKey[]).map((key) => (
                  <span
                    key={key}
                    className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${
                      completions.includes(key)
                        ? "border-green-700 bg-green-950/50 text-green-300"
                        : "border-hairline-dark bg-black/30 text-ink-mute"
                    }`}
                  >
                    {key.toUpperCase()}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4 w-full max-w-md">
        {(Object.entries(DIFFICULTY_CONFIG) as [DifficultyKey, (typeof DIFFICULTY_CONFIG)[DifficultyKey]][]).map(
          ([key, cfg]) => (
            <button
              key={key}
              onClick={() => onSelectDifficulty(key)}
              className={`p-2 rounded border text-left transition-colors ${
                difficulty === key
                  ? "border-cyan-400 bg-cyan-950/40"
                  : "border-hairline-dark bg-black/30 hover:border-on-primary-mute"
              }`}
            >
              <span className="block text-xs font-bold text-on-primary">{cfg.label}</span>
              <span className="block text-[10px] text-ink-mute leading-tight">
                {cfg.description}
              </span>
            </button>
          )
        )}
      </div>
    </>
  );
}
