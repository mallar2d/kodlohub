/**
 * Leaderboard panel — switchable tabs (best score / wave kinds) and the
 * top-10 list.
 *
 * Extracted from BratTDClient.tsx (Task 12).
 */

import React from "react";
import { formatSeconds } from "@/lib/brat-td/pure";
import type { LeaderboardEntry, LeaderboardKind } from "@/lib/brat-td/types";

export const LEADERBOARD_TABS: { key: LeaderboardKind; label: string }[] = [
  { key: "best_score", label: "Score" },
  { key: "normal_wave", label: "Normal" },
  { key: "hard_wave", label: "Hard" },
  { key: "endless_wave", label: "Endless" },
  { key: "fastest_victory", label: "Fastest" },
];

export interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
  leaderboardKind: LeaderboardKind;
  onTabChange: (kind: LeaderboardKind) => void;
}

export function LeaderboardPanel({
  entries,
  leaderboardKind,
  onTabChange,
}: LeaderboardPanelProps) {
  if (entries.length === 0) return null;
  return (
    <div className="card-dark p-3 border-hairline-dark">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="micro-cap text-ink-mute">ЛЕДЕРБОРД</p>
        <div className="flex gap-1">
          {LEADERBOARD_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                leaderboardKind === tab.key
                  ? "bg-cyan-950/60 text-cyan-300 border border-cyan-700"
                  : "text-ink-mute hover:text-on-primary border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
        {entries.slice(0, 10).map((e, i) => (
          <div
            key={`${e.name}-${e.score}-${i}`}
            className={`flex items-center justify-between gap-3 rounded border border-hairline-dark/70 bg-black/35 px-3 py-2 text-xs ${
              i === 0
                ? "text-yellow-400"
                : i === 1
                ? "text-gray-300"
                : i === 2
                ? "text-orange-400"
                : "text-on-primary-mute"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2 flex-1">
              <span className="w-5 shrink-0 text-right font-bold">{i + 1}.</span>
              <span className="flex items-center gap-1.5 min-w-0 flex-1">
                {e.activeTitle && (
                  <span className="text-cyan-400 text-[10px] uppercase font-bold tracking-wider shrink-0 bg-cyan-950/40 border border-cyan-800/40 px-1.5 py-0.5 rounded leading-none">
                    {e.activeTitle}
                  </span>
                )}
                <span className="truncate font-semibold">{e.name}</span>
              </span>
            </span>
            <span className="shrink-0 font-bold pl-2">
              {leaderboardKind === "fastest_victory"
                ? formatSeconds(e.durationSeconds ?? 0)
                : e.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
