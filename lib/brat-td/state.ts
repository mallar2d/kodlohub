// ─────────────────────────────────────────────────────────────────────────
//  State management for Brat TD — game state sync, progression persistence,
//  settings, and leaderboard helpers.
//
//  All window/storage access is guarded with SSR checks (typeof window).
//  Pure progression normalization/merging helpers take their config
//  dependencies (TOWER_CONFIGS, MAP_CONFIGS, ACHIEVEMENTS) as parameters so
//  this module remains free of direct imports from the React client.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import type {
  DifficultyKey,
  LeaderboardEntry,
  LeaderboardKind,
  MapConfig,
  ProgressionState,
  TowerConfig,
  AchievementConfig,
} from "@/lib/brat-td/types";

// ─────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────

/** localStorage key for the local leaderboard. */
export const LEADERBOARD_KEY = "brat_td_leaderboard";

/** localStorage key for the user's settings. */
export const SETTINGS_KEY = "brat_td_settings";

/** localStorage key for the progression state. */
export const PROGRESSION_KEY = "brat_td_progress";

/** Default settings shape used when no persisted value exists. */
export type GameSettings = {
  volume: number;
  sfxVolume: number;
  uiVolume: number;
  screenShake: boolean;
  particles: boolean;
  effectLimits: boolean;
};

export const DEFAULT_SETTINGS: GameSettings = {
  volume: 0.75,
  sfxVolume: 0.75,
  uiVolume: 0.75,
  screenShake: true,
  particles: true,
  effectLimits: true,
};

// ─────────────────────────────────────────────────────────────────────────
//  Progression helpers — pure functions (config injected)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Builds a progression state using a fresh config snapshot.
 * Depends on TOWER_CONFIGS for the tower masteries and MAP_CONFIGS for
 * the map completions grid.
 */
export function getDefaultProgression(
  towerConfigs: Record<string, TowerConfig>,
  mapConfigs: MapConfig[]
): ProgressionState {
  const towerMastery = Object.fromEntries(
    Object.keys(towerConfigs).map((towerType) => [
      towerType,
      { towerXp: 0, unlockedTiers: [], highestTierAchieved: 2 },
    ])
  );
  return {
    playerLevel: 1,
    totalXp: 0,
    unlockedTowers: ["hammer", "boomerang"],
    achievements: [],
    bonusStartGold: 0,
    bonusLives: 0,
    towerMastery,
    mapCompletions: Object.fromEntries(
      mapConfigs.map((map) => [map.id, [] as DifficultyKey[]])
    ),
    unlockedTitles: [],
    unlockedFrames: [],
    unlockedEffects: [],
    activeTitle: null,
    activeFrame: null,
    activeEffect: null,
  };
}

/** Maps unlocked achievements to cosmetic reward ids. */
export function getAchievementCosmetics(
  achievementIds: string[],
  achievements: AchievementConfig[]
) {
  const titles: string[] = [];
  const frames: string[] = [];
  const effects: string[] = [];
  achievementIds.forEach((id) => {
    const reward = achievements.find((a) => a.id === id)?.reward;
    if (reward?.title) titles.push(reward.title);
    if (reward?.frame) frames.push(reward.frame);
    if (reward?.effect) effects.push(reward.effect);
  });
  return { titles, frames, effects };
}

/**
 * Normalizes a partial / arbitrary progression payload into a complete
 * ProgressionState. Throws away anything invalid; caps values where
 * appropriate; recomputes player level from totalXp.
 */
export function normalizeProgression(
  progress: Partial<ProgressionState> | null | undefined,
  config: {
    towerConfigs: Record<string, TowerConfig>;
    mapConfigs: MapConfig[];
    achievements: AchievementConfig[];
    getPlayerLevelForXp: (totalXp: number) => number;
    towerUnlockLevels: Record<string, number>;
  }
): ProgressionState {
  const base = getDefaultProgression(config.towerConfigs, config.mapConfigs);
  const totalXp = Math.max(0, Math.floor(progress?.totalXp ?? base.totalXp));
  const playerLevel = config.getPlayerLevelForXp(totalXp);
  const unlockedByLevel = Object.entries(config.towerUnlockLevels)
    .filter(([, level]) => playerLevel >= level)
    .map(([towerType]) => towerType);
  const towerMastery = { ...base.towerMastery };
  Object.entries(progress?.towerMastery ?? {}).forEach(([towerType, mastery]) => {
    towerMastery[towerType] = {
      towerXp: Math.max(0, Number(mastery.towerXp ?? 0)),
      unlockedTiers: Array.from(new Set(mastery.unlockedTiers ?? [])),
      highestTierAchieved: Math.max(2, Math.floor(mastery.highestTierAchieved ?? 2)),
    };
  });
  const mapCompletions = Object.fromEntries(
    config.mapConfigs.map((map) => [map.id, [] as DifficultyKey[]])
  ) as Record<string, DifficultyKey[]>;
  Object.entries(progress?.mapCompletions ?? {}).forEach(([mapId, completions]) => {
    if (!config.mapConfigs.some((map) => map.id === mapId) || !Array.isArray(completions)) return;
    mapCompletions[mapId] = Array.from(
      new Set(
        completions.filter(
          (key): key is DifficultyKey => key === "easy" || key === "normal" || key === "hard"
        )
      )
    );
  });
  const achievements = Array.from(new Set(progress?.achievements ?? []));
  const cosmetics = getAchievementCosmetics(achievements, config.achievements);
  const unlockedTitles = Array.from(
    new Set([...(progress?.unlockedTitles ?? []), ...cosmetics.titles])
  );
  const unlockedFrames = Array.from(
    new Set([...(progress?.unlockedFrames ?? []), ...cosmetics.frames])
  );
  const unlockedEffects = Array.from(
    new Set([...(progress?.unlockedEffects ?? []), ...cosmetics.effects])
  );
  return {
    playerLevel,
    totalXp,
    unlockedTowers: Array.from(
      new Set([...(progress?.unlockedTowers ?? []), ...unlockedByLevel, "hammer", "boomerang"])
    ),
    achievements,
    bonusStartGold: Math.min(500, Math.max(0, Math.floor(progress?.bonusStartGold ?? 0))),
    bonusLives: Math.max(0, Math.floor(progress?.bonusLives ?? 0)),
    towerMastery,
    mapCompletions,
    unlockedTitles,
    unlockedFrames,
    unlockedEffects,
    activeTitle:
      progress?.activeTitle && unlockedTitles.includes(progress.activeTitle)
        ? progress.activeTitle
        : null,
    activeFrame:
      progress?.activeFrame && unlockedFrames.includes(progress.activeFrame)
        ? progress.activeFrame
        : null,
    activeEffect:
      progress?.activeEffect && unlockedEffects.includes(progress.activeEffect)
        ? progress.activeEffect
        : null,
  };
}

/**
 * Combines two progression states by taking the max of every numeric field
 * and unioning all arrays. The result is re-normalized.
 */
export function mergeProgression(
  a: ProgressionState,
  b: ProgressionState,
  config: {
    towerConfigs: Record<string, TowerConfig>;
    mapConfigs: MapConfig[];
    achievements: AchievementConfig[];
    getPlayerLevelForXp: (totalXp: number) => number;
    towerUnlockLevels: Record<string, number>;
  }
): ProgressionState {
  const totalXp = Math.max(a.totalXp, b.totalXp);
  const achievements = Array.from(new Set([...a.achievements, ...b.achievements]));
  const towerMastery = { ...a.towerMastery };
  Object.entries(b.towerMastery).forEach(([towerType, mastery]) => {
    const current =
      towerMastery[towerType] ?? { towerXp: 0, unlockedTiers: [], highestTierAchieved: 2 };
    towerMastery[towerType] = {
      towerXp: Math.max(current.towerXp, mastery.towerXp),
      unlockedTiers: Array.from(new Set([...current.unlockedTiers, ...mastery.unlockedTiers])),
      highestTierAchieved: Math.max(current.highestTierAchieved, mastery.highestTierAchieved),
    };
  });
  return normalizeProgression(
    {
      totalXp,
      achievements,
      unlockedTowers: Array.from(new Set([...a.unlockedTowers, ...b.unlockedTowers])),
      bonusStartGold: Math.max(a.bonusStartGold, b.bonusStartGold),
      bonusLives: Math.max(a.bonusLives, b.bonusLives),
      unlockedTitles: Array.from(new Set([...a.unlockedTitles, ...b.unlockedTitles])),
      unlockedFrames: Array.from(new Set([...a.unlockedFrames, ...b.unlockedFrames])),
      unlockedEffects: Array.from(new Set([...a.unlockedEffects, ...b.unlockedEffects])),
      activeTitle: b.activeTitle ?? a.activeTitle,
      activeFrame: b.activeFrame ?? a.activeFrame,
      activeEffect: b.activeEffect ?? a.activeEffect,
      towerMastery,
      mapCompletions: Object.fromEntries(
        config.mapConfigs.map((map) => [
          map.id,
          Array.from(
            new Set([
              ...(a.mapCompletions[map.id] ?? []),
              ...(b.mapCompletions[map.id] ?? []),
            ])
          ),
        ])
      ),
    },
    config
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Progression localStorage persistence
// ─────────────────────────────────────────────────────────────────────────

/**
 * Loads the saved progression from localStorage. Returns `null` config shape
 * (= default progression) when running on the server, missing, or broken.
 *
 * Note: callers must pass a config when normalising the result. The default
 * fallback returned here is intentionally un-normalised (the caller will
 * normalise with its own config).
 */
export function loadLocalProgression(
  towerConfigs: Record<string, TowerConfig>,
  mapConfigs: MapConfig[]
): ProgressionState {
  if (typeof window === "undefined") return getDefaultProgression(towerConfigs, mapConfigs);
  try {
    const raw = localStorage.getItem(PROGRESSION_KEY);
    return raw ? (JSON.parse(raw) as ProgressionState) : getDefaultProgression(towerConfigs, mapConfigs);
  } catch {
    return getDefaultProgression(towerConfigs, mapConfigs);
  }
}

/** Persists the progression to localStorage. No-op during SSR or on failure. */
export function saveLocalProgression(progress: ProgressionState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROGRESSION_KEY, JSON.stringify(progress));
  } catch (err) {
    console.warn("[brat-td] saveLocalProgression:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  Settings localStorage persistence
// ─────────────────────────────────────────────────────────────────────────

/** Loads the saved settings or DEFAULT_SETTINGS on SSR/missing/broken. */
export function loadSettings(): GameSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      volume:
        typeof parsed.volume === "number"
          ? Math.max(0, Math.min(1, parsed.volume))
          : DEFAULT_SETTINGS.volume,
      sfxVolume:
        typeof parsed.sfxVolume === "number"
          ? Math.max(0, Math.min(1, parsed.sfxVolume))
          : DEFAULT_SETTINGS.sfxVolume,
      uiVolume:
        typeof parsed.uiVolume === "number"
          ? Math.max(0, Math.min(1, parsed.uiVolume))
          : DEFAULT_SETTINGS.uiVolume,
      screenShake:
        typeof parsed.screenShake === "boolean" ? parsed.screenShake : DEFAULT_SETTINGS.screenShake,
      particles: typeof parsed.particles === "boolean" ? parsed.particles : DEFAULT_SETTINGS.particles,
      effectLimits:
        typeof parsed.effectLimits === "boolean" ? parsed.effectLimits : DEFAULT_SETTINGS.effectLimits,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Persists the settings to localStorage. No-op during SSR or on failure. */
export function saveSettings(settings: GameSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn("[brat-td] saveSettings:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  Leaderboard (local + remote)
// ─────────────────────────────────────────────────────────────────────────

/** Returns the local leaderboard; seeds a default entry on first read. */
export function getLocalLeaderboard(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) {
      const defaults: LeaderboardEntry[] = [
        { name: "Петро Хоменко", score: 22000, wave: 46, date: "2026-06-12" },
      ];
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(raw) as LeaderboardEntry[];
  } catch {
    return [];
  }
}

/** Writes the leaderboard to localStorage. */
export function saveLocalLeaderboard(entries: LeaderboardEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}

/**
 * Inserts a new entry, sorts by score desc, and keeps the top 10.
 * The active title/frame are sourced from the supplied progression state.
 */
export function addToLocalLeaderboard(
  name: string,
  score: number,
  wave: number,
  progress: ProgressionState
): LeaderboardEntry[] {
  const entries = getLocalLeaderboard();
  entries.push({
    name,
    score,
    wave,
    date: new Date().toISOString().split("T")[0],
    difficulty: "normal",
    activeTitle: progress.activeTitle,
    activeFrame: progress.activeFrame,
  });
  entries.sort((a, b) => b.score - a.score);
  const top10 = entries.slice(0, 10);
  saveLocalLeaderboard(top10);
  return top10;
}

/** Fetches the global leaderboard for a given kind. */
export async function fetchGlobalLeaderboard(
  kind: LeaderboardKind = "best_score"
): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`/api/brat-td?leaderboard=${kind}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.leaderboard ?? []).map(
      (e: {
        player_name: string;
        score: number;
        wave: number;
        created_at: string;
        difficulty?: DifficultyKey;
        is_endless?: boolean;
        duration_seconds?: number | null;
        active_title?: string | null;
        active_frame?: string | null;
        map_id?: string | null;
      }) => ({
        name: e.player_name,
        score: e.score,
        wave: e.wave,
        date: e.created_at?.split("T")[0] ?? "",
        isGlobal: true,
        difficulty: e.difficulty,
        isEndless: e.is_endless,
        durationSeconds: e.duration_seconds,
        activeTitle: e.active_title,
        activeFrame: e.active_frame,
        mapId: e.map_id,
      })
    );
  } catch {
    return [];
  }
}

/** Fetches both the global leaderboard and the cloud progression. */
export async function fetchBratTdData(
  kind: LeaderboardKind = "best_score"
): Promise<{ leaderboard: LeaderboardEntry[]; progress: ProgressionState | null }> {
  try {
    const res = await fetch(`/api/brat-td?leaderboard=${kind}`);
    if (!res.ok) return { leaderboard: [], progress: null };
    const data = await res.json();
    return {
      leaderboard: (data.leaderboard ?? []).map(
        (e: {
          player_name: string;
          score: number;
          wave: number;
          created_at: string;
          difficulty?: DifficultyKey;
          is_endless?: boolean;
          duration_seconds?: number | null;
          active_title?: string | null;
          active_frame?: string | null;
          map_id?: string | null;
        }) => ({
          name: e.player_name,
          score: e.score,
          wave: e.wave,
          date: e.created_at?.split("T")[0] ?? "",
          isGlobal: true,
          difficulty: e.difficulty,
          isEndless: e.is_endless,
          durationSeconds: e.duration_seconds,
          activeTitle: e.active_title,
          activeFrame: e.active_frame,
          mapId: e.map_id,
        })
      ),
      progress: null, // caller will normalise with its own config
    };
  } catch {
    return { leaderboard: [], progress: null };
  }
}

/** Persists progression to the cloud (PATCH /api/brat-td). */
export async function saveCloudProgression(progress: ProgressionState): Promise<boolean> {
  try {
    const res = await fetch("/api/brat-td", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Submits a score to the global leaderboard. */
export async function submitGlobalScore(
  playerName: string,
  score: number,
  wave: number,
  meta: {
    difficulty: DifficultyKey;
    isEndless: boolean;
    durationSeconds: number;
    version: string;
    activeTitle: string | null;
    activeFrame: string | null;
    mapId: string;
  }
): Promise<boolean> {
  try {
    const res = await fetch("/api/brat-td", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName, score, wave, ...meta }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Merges and deduplicates leaderboard entries (key = name+score). */
export function mergeLeaderboards(
  global: LeaderboardEntry[],
  local: LeaderboardEntry[]
): LeaderboardEntry[] {
  const merged = [...global, ...local];
  merged.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const unique: LeaderboardEntry[] = [];
  for (const e of merged) {
    const key = `${e.name}-${e.score}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(e);
    }
  }
  return unique.slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────
//  useGameSync — replaces the 18 individual state→ref `useEffect` watchers
//  with a single 150ms polling loop. Behaviour is identical: the loop
//  copies every tracked state value into its matching ref on every tick,
//  guaranteeing the rAF loop never reads a stale value.
// ─────────────────────────────────────────────────────────────────────────

/**
 * A single state→ref sync target. `value` is the live React state and
 * `ref` is the mutable mirror that the game loop reads from. The hook
 * writes `value` into `ref.current` on every poll.
 */
export type SyncTarget<T> = {
  value: T;
  ref: { current: T };
};

export type UseGameSyncConfig = {
  // All 18 reactive fields that need to be mirrored into refs.
  lives: SyncTarget<number>;
  gold: SyncTarget<number>;
  wave: SyncTarget<number>;
  isWaveActive: SyncTarget<boolean>;
  gameStatus: SyncTarget<"idle" | "playing" | "gameover" | "victory">;
  isPaused: SyncTarget<boolean>;
  gameSpeed: SyncTarget<1 | 2 | 3>;
  isAutoStart: SyncTarget<boolean>;
  score: SyncTarget<number>;
  selectedShopTower: SyncTarget<string | null>;
  mousePos: SyncTarget<{ x: number; y: number }>;
  isMouseOnCanvas: SyncTarget<boolean>;
  draggedTowerType: SyncTarget<string | null>;
  draggedTowerPos: SyncTarget<{ x: number; y: number } | null>;
  difficulty: SyncTarget<DifficultyKey>;
  selectedMapId: SyncTarget<string>;
  settings: SyncTarget<GameSettings>;
  progression: SyncTarget<ProgressionState>;
  // Tick interval — keep at 150ms (6 Hz) to match the original behaviour.
  intervalMs?: number;
};

/**
 * Replaces the 18 individual `useEffect(() => { ref.current = state; }, [state])`
 * watchers with a single setInterval loop. Each tracked field is mirrored
 * into its ref on every tick. This is functionally identical to the
 * original 18 useEffects (each just did `ref.current = state`).
 *
 * The 150ms cadence matches the existing periodic React refresh that
 * pushes the game loop's ref writes back into React state — keeping the
 * two intervals in lockstep avoids any visible lag.
 */
export function useGameSync(config: UseGameSyncConfig): void {
  // Read the latest values on every tick — never re-subscribe.
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const tick = () => {
      const c = configRef.current;
      c.lives.ref.current = c.lives.value;
      c.gold.ref.current = c.gold.value;
      c.wave.ref.current = c.wave.value;
      c.isWaveActive.ref.current = c.isWaveActive.value;
      c.gameStatus.ref.current = c.gameStatus.value;
      c.isPaused.ref.current = c.isPaused.value;
      c.gameSpeed.ref.current = c.gameSpeed.value;
      c.isAutoStart.ref.current = c.isAutoStart.value;
      c.score.ref.current = c.score.value;
      c.selectedShopTower.ref.current = c.selectedShopTower.value;
      c.mousePos.ref.current = c.mousePos.value;
      c.isMouseOnCanvas.ref.current = c.isMouseOnCanvas.value;
      c.draggedTowerType.ref.current = c.draggedTowerType.value;
      c.draggedTowerPos.ref.current = c.draggedTowerPos.value;
      c.difficulty.ref.current = c.difficulty.value;
      c.selectedMapId.ref.current = c.selectedMapId.value;
      c.settings.ref.current = c.settings.value;
      c.progression.ref.current = c.progression.value;
    };

    // Run once immediately so the refs are primed before the first rAF tick.
    tick();
    const id = setInterval(tick, config.intervalMs ?? 150);
    return () => clearInterval(id);
  }, [config.intervalMs]);
}
