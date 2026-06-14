/**
 * Progression / session / achievement action handlers for Brat TD.
 *
 * Extracted from BratTDClient.tsx (Task 12) to keep the React component thin.
 * Every function here is a pure orchestration helper: it takes a context
 * bundle (refs, state setters, callbacks) and mutates the right places.
 *
 * No React, no DOM, no global state. Side effects are limited to the
 * explicit callbacks / setters passed in the context.
 */

import {
  ACHIEVEMENTS,
  getEndlessXpMultiplier,
  TIER_UNLOCK_COSTS,
  TOWER_CONFIGS,
} from "@/app/(main)/tools/brat-td/gameConfig";
import { normalizeProgression } from "@/lib/brat-td/state";
import type {
  AchievementConfig,
  AchievementToast,
  DifficultyKey,
  MapConfig,
  PlacedTower,
  ProgressionState,
  SessionSummary,
  TowerConfig,
} from "@/lib/brat-td/types";

// ─────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────

/** Bundle of every ref / setter / callback the action helpers touch. */
export interface ProgressionActionsConfig {
  // Refs the helpers write into
  progressionRef: { current: ProgressionState };
  sessionPlayerXpRef: { current: number };
  sessionTowerXpRef: { current: Record<string, number> };
  sessionAchievementsRef: { current: string[] };
  sessionStartLevelRef: { current: number };
  sessionStartUnlockedTowersRef: { current: string[] };
  sessionSummaryDoneRef: { current: boolean };
  gameStartFrameRef: { current: number };
  frameCountRef: { current: number };
  waveRef: { current: number };
  difficultyRef: { current: DifficultyKey };
  towersRef: { current: PlacedTower[] };
  selectedMapIdRef?: { current: string };

  // React state setters
  setProgression: React.Dispatch<React.SetStateAction<ProgressionState>>;
  setAchievementToasts: React.Dispatch<React.SetStateAction<AchievementToast[]>>;
  setSessionSummary?: React.Dispatch<React.SetStateAction<SessionSummary | null>>;

  // Callbacks
  pushLog: (msg: string) => void;
  getMapById?: (id: string) => { name: string };

  // Static config mirrors
  PROGRESSION_CONFIG: {
    towerConfigs: Record<string, TowerConfig>;
    mapConfigs: MapConfig[];
    achievements: AchievementConfig[];
    getPlayerLevelForXp: (totalXp: number) => number;
    towerUnlockLevels: Record<string, number>;
  };
  DIFFICULTY_CONFIG?: Record<DifficultyKey, { label: string }>;
}

// ─────────────────────────────────────────────────────────────────────────
//  Achievement reward text formatting
// ─────────────────────────────────────────────────────────────────────────

/** Single source of truth for the human-readable reward line shown in toasts / cards. */
export function formatAchievementReward(reward: {
  bonusStartGold?: number;
  bonusLives?: number;
  title?: string;
  frame?: string;
  effect?: string;
}): string {
  const parts: string[] = [];
  if (reward.bonusStartGold) parts.push(`+${reward.bonusStartGold} старт ☕`);
  if (reward.bonusLives) parts.push(`+${reward.bonusLives} ❤️`);
  if (reward.title) parts.push(`титул: ${reward.title}`);
  if (reward.frame) parts.push(`рамка: ${reward.frame}`);
  if (reward.effect) parts.push("ефект T5");
  return parts.join(" · ") || "косметика";
}

// ─────────────────────────────────────────────────────────────────────────
//  Tier-unlock key helper
// ─────────────────────────────────────────────────────────────────────────

export const getTierUnlockKey = (pathIndex: number, tier: number) =>
  `${pathIndex + 1}:${tier}`;

// ─────────────────────────────────────────────────────────────────────────
//  Achievement toast queue
// ─────────────────────────────────────────────────────────────────────────

export function enqueueAchievementToast(
  achievementId: string,
  context: Pick<ProgressionActionsConfig, "setAchievementToasts">
): void {
  const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
  if (!achievement) return;
  const toast: AchievementToast = {
    id: `${achievement.id}-${Date.now()}`,
    name: achievement.name,
    description: achievement.description,
    reward: formatAchievementReward(achievement.reward),
  };
  context.setAchievementToasts((prev) => [...prev.slice(-2), toast]);
  if (typeof window !== "undefined") {
    window.setTimeout(() => {
      context.setAchievementToasts((prev) =>
        prev.filter((item) => item.id !== toast.id)
      );
    }, 4800);
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  Pure reward application (no React, safe for tests)
// ─────────────────────────────────────────────────────────────────────────

/** Applies a list of achievement reward definitions to a progression snapshot. */
export function applyAchievementRewardsPure(
  achievementIds: string[],
  progress: ProgressionState
): ProgressionState {
  let bonusStartGold = progress.bonusStartGold;
  let bonusLives = progress.bonusLives;
  const titles = [...progress.unlockedTitles];
  const frames = [...progress.unlockedFrames];
  const effects = [...progress.unlockedEffects];
  achievementIds.forEach((achievementId) => {
    const reward = ACHIEVEMENTS.find((a) => a.id === achievementId)?.reward;
    bonusStartGold += reward?.bonusStartGold ?? 0;
    bonusLives += reward?.bonusLives ?? 0;
    if (reward?.title && !titles.includes(reward.title)) titles.push(reward.title);
    if (reward?.frame && !frames.includes(reward.frame)) frames.push(reward.frame);
    if (reward?.effect && !effects.includes(reward.effect)) effects.push(reward.effect);
  });
  return {
    ...progress,
    bonusStartGold: Math.min(500, bonusStartGold),
    bonusLives,
    unlockedTitles: titles,
    unlockedFrames: frames,
    unlockedEffects: effects,
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  Mutable action helpers
// ─────────────────────────────────────────────────────────────────────────

export function awardAchievements(
  achievementIds: string[],
  ctx: ProgressionActionsConfig
): void {
  if (achievementIds.length === 0) return;
  ctx.setProgression((prev) => {
    const freshIds = achievementIds.filter((id) => !prev.achievements.includes(id));
    if (freshIds.length === 0) return prev;
    const next = normalizeProgression(
      applyAchievementRewardsPure(freshIds, {
        ...prev,
        achievements: [...prev.achievements, ...freshIds],
      }),
      ctx.PROGRESSION_CONFIG
    );
    ctx.progressionRef.current = next;
    freshIds.forEach((id) => {
      const achievement = ACHIEVEMENTS.find((a) => a.id === id);
      ctx.sessionAchievementsRef.current = Array.from(
        new Set([...ctx.sessionAchievementsRef.current, id])
      );
      enqueueAchievementToast(id, ctx);
      ctx.pushLog(`🏆 Досягнення: ${achievement?.name ?? id}!`);
    });
    return next;
  });
}

export function addPlayerXp(
  rawXp: number,
  ctx: ProgressionActionsConfig
): void {
  if (rawXp <= 0) return;
  const difficultyMult = ctx.difficultyRef.current === "hard" ? 1.5 : 1;
  const endlessMult = getEndlessXpMultiplier(ctx.waveRef.current);
  const gained = Math.max(1, Math.floor(rawXp * difficultyMult * endlessMult));
  ctx.sessionPlayerXpRef.current += gained;
  ctx.setProgression((prev) => {
    const beforeLevel = prev.playerLevel;
    const next = normalizeProgression(
      { ...prev, totalXp: prev.totalXp + gained },
      ctx.PROGRESSION_CONFIG
    );
    ctx.progressionRef.current = next;
    if (next.playerLevel > beforeLevel) {
      ctx.pushLog(`⬆️ Рівень гравця ${next.playerLevel}! Нові вежі/нагороди відкрито.`);
    }
    const earned: string[] = [];
    if (next.playerLevel >= 10) earned.push("level_10");
    if (next.playerLevel >= 25) earned.push("level_25");
    if (next.playerLevel >= 50) earned.push("level_50");
    if (next.unlockedTowers.length >= Object.keys(TOWER_CONFIGS).length) earned.push("all_towers");
    const defer = typeof window !== "undefined"
      ? (cb: () => void) => window.setTimeout(cb, 0)
      : (cb: () => void) => cb();
    defer(() => awardAchievements(earned, ctx));
    return next;
  });
}

export function addTowerXp(
  towerType: string,
  amount: number,
  ctx: ProgressionActionsConfig
): void {
  if (amount <= 0 || !TOWER_CONFIGS[towerType]) return;
  ctx.sessionTowerXpRef.current[towerType] =
    (ctx.sessionTowerXpRef.current[towerType] ?? 0) + amount;
  ctx.setProgression((prev) => {
    const mastery = prev.towerMastery[towerType] ?? {
      towerXp: 0,
      unlockedTiers: [],
      highestTierAchieved: 2,
    };
    const next = normalizeProgression(
      {
        ...prev,
        towerMastery: {
          ...prev.towerMastery,
          [towerType]: { ...mastery, towerXp: mastery.towerXp + amount },
        },
      },
      ctx.PROGRESSION_CONFIG
    );
    ctx.progressionRef.current = next;
    return next;
  });
}

export function addTowerXpById(
  towerId: string | undefined,
  amount: number,
  ctx: ProgressionActionsConfig
): void {
  if (!towerId || amount <= 0) return;
  const tower = ctx.towersRef.current.find((t) => t.id === towerId);
  if (tower) addTowerXp(tower.type, amount, ctx);
}

export function unlockTierForTower(
  towerType: string,
  pathIndex: number,
  tier: number,
  ctx: Pick<
    ProgressionActionsConfig,
    "progressionRef" | "setProgression" | "pushLog" | "PROGRESSION_CONFIG"
  >
): void {
  const cost = TIER_UNLOCK_COSTS[tier];
  if (!cost) return;
  if (tier === 5 && ctx.progressionRef.current.playerLevel < 25) {
    ctx.pushLog("Tier 5 відкривається тільки з рівня гравця 25.");
    return;
  }
  const key = getTierUnlockKey(pathIndex, tier);
  ctx.setProgression((prev) => {
    const mastery = prev.towerMastery[towerType] ?? {
      towerXp: 0,
      unlockedTiers: [],
      highestTierAchieved: 2,
    };
    if (mastery.unlockedTiers.includes(key)) return prev;
    if (mastery.towerXp < cost) {
      ctx.pushLog(
        `Недостатньо XP ${TOWER_CONFIGS[towerType].name}: треба ${cost}, є ${Math.floor(mastery.towerXp)}.`
      );
      return prev;
    }
    const next = normalizeProgression(
      {
        ...prev,
        towerMastery: {
          ...prev.towerMastery,
          [towerType]: {
            ...mastery,
            towerXp: mastery.towerXp - cost,
            unlockedTiers: [...mastery.unlockedTiers, key],
          },
        },
      },
      ctx.PROGRESSION_CONFIG
    );
    ctx.progressionRef.current = next;
    ctx.pushLog(`Відкрито ${TOWER_CONFIGS[towerType].name} P${pathIndex + 1}T${tier} за ${cost} XP.`);
    return next;
  });
}

export function hasT5ForTowerPath(
  towerType: string,
  pathIndex: number,
  exceptTowerId: string | undefined,
  ctx: Pick<ProgressionActionsConfig, "towersRef">
): boolean {
  return ctx.towersRef.current.some((tower) => {
    if (tower.type !== towerType || tower.id === exceptTowerId) return false;
    return pathIndex === 0
      ? tower.path1Tier >= 5
      : pathIndex === 1
      ? tower.path2Tier >= 5
      : tower.path3Tier >= 5;
  });
}

export function buildSessionSummary(ctx: ProgressionActionsConfig): void {
  if (!ctx.setSessionSummary) return;
  if (ctx.sessionSummaryDoneRef.current) return;
  ctx.sessionSummaryDoneRef.current = true;
  const endProgress = ctx.progressionRef.current;
  ctx.setSessionSummary({
    playerXp: ctx.sessionPlayerXpRef.current,
    towerXp: { ...ctx.sessionTowerXpRef.current },
    achievements: [...ctx.sessionAchievementsRef.current],
    startLevel: ctx.sessionStartLevelRef.current,
    endLevel: endProgress.playerLevel,
    startUnlockedTowers: [...ctx.sessionStartUnlockedTowersRef.current],
    endUnlockedTowers: [...endProgress.unlockedTowers],
    durationSeconds: Math.max(
      0,
      Math.floor((ctx.frameCountRef.current - ctx.gameStartFrameRef.current) / 60)
    ),
    endlessMultiplier: getEndlessXpMultiplier(ctx.waveRef.current),
  });
}

export function markCurrentMapCompleted(ctx: ProgressionActionsConfig): void {
  if (!ctx.selectedMapIdRef || !ctx.getMapById || !ctx.DIFFICULTY_CONFIG) return;
  const mapId = ctx.selectedMapIdRef.current;
  const difficultyKey = ctx.difficultyRef.current;
  ctx.setProgression((prev) => {
    const current = prev.mapCompletions[mapId] ?? [];
    if (current.includes(difficultyKey)) return prev;
    const next = normalizeProgression(
      {
        ...prev,
        mapCompletions: {
          ...prev.mapCompletions,
          [mapId]: [...current, difficultyKey],
        },
      },
      ctx.PROGRESSION_CONFIG
    );
    ctx.progressionRef.current = next;
    const mapName = ctx.getMapById ? ctx.getMapById(mapId).name : mapId;
    const diffLabel = ctx.DIFFICULTY_CONFIG ? ctx.DIFFICULTY_CONFIG[difficultyKey].label : difficultyKey;
    ctx.pushLog(`Карту ${mapName} пройдено на складності ${diffLabel}.`);
    return next;
  });
}

export function isTowerUnlocked(
  towerType: string,
  progress: ProgressionState
): boolean {
  return progress.unlockedTowers.includes(towerType);
}

export function isTierUnlocked(
  towerType: string,
  pathIndex: number,
  tier: number,
  progress: ProgressionState
): boolean {
  if (tier <= 2) return true;
  return (
    progress.towerMastery[towerType]?.unlockedTiers.includes(
      getTierUnlockKey(pathIndex, tier)
    ) ?? false
  );
}
