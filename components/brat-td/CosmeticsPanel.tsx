/**
 * Cosmetics panel — title / frame / effect selectors for cosmetic unlocks.
 *
 * Extracted from BratTDClient.tsx (Task 12).
 */

import React from "react";
import { normalizeProgression } from "@/lib/brat-td/state";
import type { ProgressionState } from "@/lib/brat-td/types";

export interface CosmeticsPanelConfig {
  towerConfigs: Record<string, import("@/lib/brat-td/types").TowerConfig>;
  mapConfigs: import("@/lib/brat-td/types").MapConfig[];
  achievements: import("@/lib/brat-td/types").AchievementConfig[];
  getPlayerLevelForXp: (totalXp: number) => number;
  towerUnlockLevels: Record<string, number>;
}

export interface CosmeticsPanelProps {
  progression: ProgressionState;
  setProgression: React.Dispatch<React.SetStateAction<ProgressionState>>;
  PROGRESSION_CONFIG: CosmeticsPanelConfig;
}

export function CosmeticsPanel({
  progression,
  setProgression,
  PROGRESSION_CONFIG,
}: CosmeticsPanelProps) {
  const hasAny =
    progression.unlockedTitles.length > 0 ||
    progression.unlockedFrames.length > 0 ||
    progression.unlockedEffects.length > 0;
  if (!hasAny) return null;

  return (
    <div className="card-dark p-4 border-hairline-dark">
      <p className="micro-cap text-ink-mute mb-3">КОСМЕТИКА</p>
      <div className="space-y-3">
        {progression.unlockedTitles.length > 0 && (
          <Selector
            label="Титул"
            value={progression.activeTitle}
            options={progression.unlockedTitles}
            onChange={(v) =>
              setProgression((prev) =>
                normalizeProgression({ ...prev, activeTitle: v || null }, PROGRESSION_CONFIG)
              )
            }
          />
        )}
        {progression.unlockedFrames.length > 0 && (
          <Selector
            label="Рамка"
            value={progression.activeFrame}
            options={progression.unlockedFrames}
            onChange={(v) =>
              setProgression((prev) =>
                normalizeProgression({ ...prev, activeFrame: v || null }, PROGRESSION_CONFIG)
              )
            }
          />
        )}
        {progression.unlockedEffects.length > 0 && (
          <Selector
            label="Ефект"
            value={progression.activeEffect}
            options={progression.unlockedEffects}
            onChange={(v) =>
              setProgression((prev) =>
                normalizeProgression({ ...prev, activeEffect: v || null }, PROGRESSION_CONFIG)
              )
            }
          />
        )}
      </div>
    </div>
  );
}

function Selector({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
}) {
  return (
    <div>
      <p className="text-[11px] text-ink-mute mb-1">{label}</p>
      <select
        className="w-full px-2 py-1.5 bg-black/40 border border-hairline-dark rounded text-xs text-on-primary"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">— немає —</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
