/**
 * UI panels for game-over / victory / leaderboard previews.
 * Extracted from BratTDClient.tsx to keep the main game component thin.
 */

import React from "react";
import { TOWER_CONFIGS } from "@/app/(main)/tools/brat-td/gameConfig";
import { formatSeconds } from "@/lib/brat-td/pure";
import type { LeaderboardEntry, SessionSummary } from "@/lib/brat-td/types";

export function SessionSummaryPanel({ summary }: { summary: SessionSummary }) {
  const towerTypes = Object.keys(summary.towerXp).sort((a, b) => summary.towerXp[b] - summary.towerXp[a]);
  const leveledUp = summary.endLevel > summary.startLevel;
  const newTowers = summary.endUnlockedTowers.filter((t) => !summary.startUnlockedTowers.includes(t));
  return (
    <div className="w-full max-w-sm bg-zinc-900/90 border border-hairline-dark rounded p-4 mb-4 text-left">
      <p className="micro-cap text-cyan-400 mb-2">ПІДСУМОК СЕСІЇ</p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-ink-mute">Player XP</span>
          <span className="font-bold text-cyan-300">+{Math.floor(summary.playerXp)}</span>
        </div>
        {leveledUp && (
          <div className="text-yellow-400 font-bold">⬆️ LVL {summary.startLevel} → LVL {summary.endLevel}</div>
        )}
        {newTowers.length > 0 && (
          <div className="text-green-400 text-xs">
            Нові вежі: {newTowers.map((t) => TOWER_CONFIGS[t]?.emoji ?? "?").join(" ")}
          </div>
        )}
        {summary.achievements.length > 0 && (
          <div className="text-yellow-400 text-xs">Досягнень: {summary.achievements.length}</div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-ink-mute">Час гри</span>
          <span className="font-bold text-on-primary">{formatSeconds(summary.durationSeconds)}</span>
        </div>
        {summary.endlessMultiplier < 1 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-mute">Endless XP mult</span>
            <span className="font-bold text-purple-300">{(summary.endlessMultiplier * 100).toFixed(0)}%</span>
          </div>
        )}
        {towerTypes.length > 0 && (
          <div className="pt-2 border-t border-hairline-dark/50 mt-2">
            <p className="text-[10px] text-ink-mute mb-1">TOWER XP</p>
            <div className="flex flex-wrap gap-2">
              {towerTypes.slice(0, 5).map((towerType) => (
                <span key={towerType} className="text-xs bg-black/40 px-1.5 py-0.5 rounded border border-hairline-dark/50">
                  {TOWER_CONFIGS[towerType]?.emoji ?? "?"} +{Math.floor(summary.towerXp[towerType])}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function LeaderboardPreview({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="w-full max-w-sm mb-4 text-left">
      <p className="micro-cap text-ink-mute mb-2 text-center">ЛЕДЕРБОРД</p>
      <div className="bg-zinc-900/80 border border-hairline-dark rounded p-2 max-h-48 overflow-y-auto">
        {entries.map((e, i) => (
          <div key={i} className={`flex items-center justify-between py-1.5 px-2 text-xs ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-on-primary-mute"}`}>
            <span className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-5 text-right font-bold shrink-0">{i + 1}.</span>
              <span className="flex items-center gap-1.5 min-w-0 flex-1">
                {e.activeTitle && (
                  <span className="text-cyan-400 text-[9px] uppercase font-bold tracking-wider shrink-0 bg-cyan-950/40 border border-cyan-800/40 px-1 py-0.5 rounded leading-none">
                    {e.activeTitle}
                  </span>
                )}
                <span className="truncate font-semibold">{e.name}</span>
              </span>
            </span>
            <span className="font-bold shrink-0 pl-2">{e.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
