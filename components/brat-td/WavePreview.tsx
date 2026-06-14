/**
 * Wave preview — small card showing the upcoming wave's enemy composition
 * and traits, shown between waves.
 *
 * Extracted from BratTDClient.tsx (Task 12).
 */

import React from "react";
import { ENEMY_CONFIGS, getScaledWave, getEnemyStatsForWave } from "@/app/(main)/tools/brat-td/gameConfig";
import { getMapById, getRouteById, getWaveRouteIds } from "@/lib/brat-td/maps";
import type { MapConfig } from "@/lib/brat-td/types";

export interface WavePreviewProps {
  wave: number;
  selectedMapId: string;
}

export function WavePreview({ wave, selectedMapId }: WavePreviewProps) {
  if (wave > 56) return null;
  const activeMap: MapConfig = getMapById(selectedMapId);
  const routeIds = getWaveRouteIds(activeMap, wave);
  const nextSegments = getScaledWave(wave);
  const counts: Record<string, number> = {};
  let totalHp = 0;
  const segmentStats = nextSegments.map((s) => getEnemyStatsForWave(s.type, wave, s.modifiers));
  nextSegments.forEach((s) => {
    const stats = getEnemyStatsForWave(s.type, wave, s.modifiers);
    counts[s.type] = (counts[s.type] || 0) + s.count;
    totalHp += stats.hp * s.count;
  });
  const types = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const totalEnemies = Object.values(counts).reduce((a, b) => a + b, 0);
  const hasCamo = segmentStats.some((stats) => stats.isCamo);
  const hasPhantom = segmentStats.some((stats) => stats.isPhantomCamo);
  const hasLead = segmentStats.some((stats) => stats.isLead);
  const hasArmor = segmentStats.some((stats) => stats.isArmored || stats.isSuperArmored);
  const hasRegen = segmentStats.some((stats) => stats.isRegen);
  const hasHealer = segmentStats.some((stats) => stats.isHealer);
  return (
    <div className="card-dark p-3 border-hairline-dark text-sm">
      <div className="flex items-center gap-3 mb-2">
        <span className="micro-cap text-ink-mute">Наступна хвиля {wave}:</span>
        <span className="text-ink-mute text-xs">
          {totalEnemies} ворогів • {Math.round(totalHp / 1000)}к HP
        </span>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {routeIds.map((routeId) => (
          <span
            key={routeId}
            className="rounded border border-cyan-900/70 bg-cyan-950/30 px-1.5 py-0.5 text-[10px] text-cyan-300"
          >
            {getRouteById(activeMap, routeId).name}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {types.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-black/40 border border-hairline-dark rounded text-xs"
            title={t}
          >
            <span
              className="h-2.5 w-2.5 rounded-sm border border-white/20"
              style={{ backgroundColor: ENEMY_CONFIGS[t]?.color ?? "#94a3b8" }}
            />
            <span className="font-mono text-on-primary">{counts[t]}</span>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {hasCamo && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950/60 text-purple-300 border border-purple-800">
            CAMO
          </span>
        )}
        {hasPhantom && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950/60 text-indigo-300 border border-indigo-800">
            PHANTOM
          </span>
        )}
        {hasLead && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-800 text-gray-300 border border-gray-600">
            LEAD
          </span>
        )}
        {hasArmor && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800">
            ARMOR
          </span>
        )}
        {hasRegen && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-pink-950/60 text-pink-300 border border-pink-800">
            REGEN
          </span>
        )}
        {hasHealer && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-950/60 text-green-300 border border-green-800">
            HEALER
          </span>
        )}
      </div>
    </div>
  );
}
