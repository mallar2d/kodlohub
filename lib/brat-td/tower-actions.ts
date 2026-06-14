/**
 * Tower / enemy placement action handlers for Brat TD.
 *
 * Extracted from BratTDClient.tsx (Task 12) to keep the React component thin.
 * These are the handlers the canvas / buttons call when the player builds,
 * sells, or buys an upgrade.
 */

import {
  EMOJI_MAP,
  GAME_HEIGHT,
  GAME_WIDTH,
  getEnemyStatsForWave,
  TIER_SCALING,
  TOWER_CONFIGS,
  TOWER_UNLOCK_LEVELS,
  ARRAY_CAPS,
} from "@/app/(main)/tools/brat-td/gameConfig";
import { getPureId } from "@/lib/brat-td/maps";
import { applyDifficultyToEnemy } from "@/lib/brat-td/pure";
import {
  applyUpgradeStats,
  buildUpgradeStats,
  checkUpgradeAllowed,
} from "@/lib/brat-td/pure";
import { SoundEvent } from "@/lib/brat-td/audio";
import { normalizeProgression } from "@/lib/brat-td/state";
import type {
  ActiveEnemy,
  DifficultyKey,
  EnemyModifier,
  Mine,
  MineProjectile,
  PlacedTower,
  ProgressionState,
  Upgrade,
} from "@/lib/brat-td/types";
import {
  hasT5ForTowerPath,
  isTierUnlocked,
  isTowerUnlocked,
  type ProgressionActionsConfig,
} from "@/lib/brat-td/progression-actions";
import { getDistance, getRouteById, getWaveRouteIds, isPositionOnPath } from "@/lib/brat-td/maps";
import type { MapConfig } from "@/lib/brat-td/types";

/** Local alias for the inline shape used in engine.ts. */
type ExplosionRing = {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
  coreLife: number;
  ringCount: number;
  debris: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    life: number;
    maxLife: number;
    color: string;
  }[];
};

// ─────────────────────────────────────────────────────────────────────────
//  Refs bundle — shared by every tower/enemy helper
// ─────────────────────────────────────────────────────────────────────────

export interface TowerActionsRefs {
  towersRef: { current: PlacedTower[] };
  enemiesRef: { current: ActiveEnemy[] };
  minesRef: { current: Mine[] };
  mineProjectilesRef: { current: MineProjectile[] };
  explosionRingsRef: { current: ExplosionRing[] };
  selectedMapIdRef: { current: string };
  difficultyRef: { current: DifficultyKey };
  waveRef: { current: number };
  goldRef: { current: number };
  settingsRef: { current: { effectLimits: boolean; volume: number } };
}

export interface TowerActionsSetters {
  setGold: React.Dispatch<React.SetStateAction<number>>;
  setSelectedPlacedTowerId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedTower: React.Dispatch<React.SetStateAction<PlacedTower | null>>;
  setProgression: React.Dispatch<React.SetStateAction<ProgressionState>>;
  setAchievementToasts: React.Dispatch<
    React.SetStateAction<import("@/lib/brat-td/types").AchievementToast[]>
  >;
}

export interface TowerActionsCallbacks {
  pushLog: (msg: string) => void;
  spawnFloatingText: (x: number, y: number, text: string, color?: string, size?: number, font?: string) => void;
  spawnHitParticles: (x: number, y: number, color: string, count?: number, shape?: "circle" | "square") => void;
  emitSound: (event: SoundEvent, towerType?: string) => void;
  awardAchievements: (ids: string[]) => void;
  getMapById: (id: string) => MapConfig;
}

export interface TowerActionsConfig extends TowerActionsRefs, TowerActionsSetters, TowerActionsCallbacks {
  progressionRef: { current: ProgressionState };
  selectedPlacedTower: PlacedTower | null;
  PROGRESSION_CONFIG: ProgressionActionsConfig["PROGRESSION_CONFIG"];
}

// ─────────────────────────────────────────────────────────────────────────
//  Array-cap helper (mirrors engine.pushWithCap)
// ─────────────────────────────────────────────────────────────────────────

function pushWithCap<T>(arr: T[], items: T | T[], cap: number): void {
  const itemList = Array.isArray(items) ? items : [items];
  while (arr.length + itemList.length > cap && arr.length > 0) arr.shift();
  arr.push(...itemList);
}

// ─────────────────────────────────────────────────────────────────────────
//  Place tower (used by click-to-place, drag-drop, programmatic spawn)
// ─────────────────────────────────────────────────────────────────────────

export function tryPlaceTower(
  type: string,
  x: number,
  y: number,
  ctx: TowerActionsConfig
): boolean {
  const config = TOWER_CONFIGS[type];
  if (!config) return false;
  if (!isTowerUnlocked(type, ctx.progressionRef.current)) {
    const neededLevel = TOWER_UNLOCK_LEVELS[type] ?? 1;
    ctx.pushLog(`${config.name} відкривається на рівні ${neededLevel}.`);
    return false;
  }
  if (ctx.goldRef.current < config.cost) {
    ctx.pushLog("Недостатньо Nescafe Gold!");
    return false;
  }
  if (x < 24 || x > GAME_WIDTH - 24 || y < 24 || y > GAME_HEIGHT - 24) {
    ctx.pushLog("Тут не можна ставити башти!");
    return false;
  }
  const activeMap = ctx.getMapById(ctx.selectedMapIdRef.current);
  if (isPositionOnPath(x, y, activeMap, 26)) {
    ctx.pushLog("Не можна ставити башти на дорозі!");
    return false;
  }
  const onObstacle = activeMap.obstacles.some(
    (obs: { x: number; y: number; radius: number }) => getDistance(x, y, obs.x, obs.y) < obs.radius + 18
  );
  if (onObstacle) {
    ctx.pushLog("Не можна будувати вежу на перешкоді!");
    return false;
  }
  const isOverlap = ctx.towersRef.current.some(
    (t) => getDistance(x, y, t.x, t.y) < 26
  );
  if (isOverlap) {
    ctx.pushLog("Занадто близько до іншої башти!");
    return false;
  }
  const newTower: PlacedTower = {
    id: getPureId(),
    x, y, type,
    range: config.range,
    damage: config.damage,
    fireRate: config.fireRate,
    emoji: config.emoji,
    color: config.color,
    name: config.name,
    cooldown: 0,
    upgradesBought: [],
    path1Tier: 0,
    path2Tier: 0,
    path3Tier: 0,
    level: 1,
    totalKills: 0,
    camoDetection: config.camoDetection || false,
    prioritizeCamo: false,
    prioritizeDrones: false,
    pierce: config.pierce || 1,
    tackCount: config.tackCount,
    maxMines: config.maxMines,
    targetingMode: "first",
    fireDoTDamage: config.fireDoTDamage,
    fireDoTDuration: config.fireDoTDuration,
    fireDoTMaxStacks: config.fireDoTMaxStacks,
    antiRegenFactor: config.antiRegenFactor,
  };
  if (type === "coffee") {
    newTower.buffMultiplier = 0.05;
    newTower.endOfWaveBonus = 20;
  } else if (type === "bankomat") {
    newTower.endOfWaveBonus = 25;
    newTower.rangeBuffPercent = 0.10;
  } else if (type === "gas") {
    newTower.slowAmount = 0.15;
  }
  ctx.towersRef.current.push(newTower);
  if (ctx.towersRef.current.length >= 10) {
    ctx.awardAchievements(["tower_farm"]);
  }
  ctx.setGold((prev) => prev - config.cost);
  ctx.pushLog(`Створено юніт: ${config.name}!`);
  ctx.emitSound(SoundEvent.TOWER_FIRE, type);
  ctx.spawnFloatingText(x, y - 20, `-${config.cost} ☕`, "#ef4444");
  return true;
}

// ─────────────────────────────────────────────────────────────────────────
//  Sell tower
// ─────────────────────────────────────────────────────────────────────────

export function sellSelectedTower(ctx: TowerActionsConfig): void {
  if (!ctx.selectedPlacedTower) return;
  const towerIdx = ctx.towersRef.current.findIndex(
    (t) => t.id === ctx.selectedPlacedTower!.id
  );
  if (towerIdx === -1) return;
  const tower = ctx.towersRef.current[towerIdx];
  const baseConfig = TOWER_CONFIGS[tower.type];
  let totalCost = baseConfig.cost;
  for (let i = 0; i < tower.path1Tier; i++) totalCost += baseConfig.upgrades.path1[i].cost;
  for (let i = 0; i < tower.path2Tier; i++) totalCost += baseConfig.upgrades.path2[i].cost;
  for (let i = 0; i < tower.path3Tier; i++) totalCost += baseConfig.upgrades.path3[i].cost;
  const hasTier5 =
    tower.path1Tier >= 5 || tower.path2Tier >= 5 || tower.path3Tier >= 5;
  const sellPrice = Math.floor(totalCost * (hasTier5 ? 0.5 : 0.8));
  ctx.setGold((prev) => prev + sellPrice);
  ctx.towersRef.current.splice(towerIdx, 1);
  ctx.minesRef.current = ctx.minesRef.current.filter((m) => m.towerId !== tower.id);
  ctx.mineProjectilesRef.current = ctx.mineProjectilesRef.current.filter(
    (p) => p.towerId !== tower.id
  );
  ctx.setSelectedPlacedTowerId(null);
  ctx.setSelectedTower(null);
  ctx.pushLog(`Продано ${tower.name} за ${sellPrice} Nescafe Gold.`);
  ctx.spawnFloatingText(tower.x, tower.y - 20, `+${sellPrice} ☕`, "#22c55e");
}

/** Pre-computed sell price (used in the UI button label) */
export function computeSellPrice(tower: PlacedTower): number {
  const baseConfig = TOWER_CONFIGS[tower.type];
  let totalCost = baseConfig.cost;
  for (let i = 0; i < tower.path1Tier; i++) totalCost += baseConfig.upgrades.path1[i].cost;
  for (let i = 0; i < tower.path2Tier; i++) totalCost += baseConfig.upgrades.path2[i].cost;
  for (let i = 0; i < tower.path3Tier; i++) totalCost += baseConfig.upgrades.path3[i].cost;
  const hasTier5 =
    tower.path1Tier >= 5 || tower.path2Tier >= 5 || tower.path3Tier >= 5;
  return Math.floor(totalCost * (hasTier5 ? 0.5 : 0.8));
}

// ─────────────────────────────────────────────────────────────────────────
//  Buy upgrade
// ─────────────────────────────────────────────────────────────────────────

export function buyUpgrade(
  pathIndex: number,
  ctx: TowerActionsConfig
): void {
  if (!ctx.selectedPlacedTower) return;
  const tower = ctx.towersRef.current.find(
    (t) => t.id === ctx.selectedPlacedTower!.id
  );
  if (!tower) return;
  if (
    !checkUpgradeAllowed(tower.path1Tier, tower.path2Tier, tower.path3Tier, pathIndex)
  ) {
    ctx.pushLog("Цей шлях заблоковано правилами крос-пасингу BTD6!");
    return;
  }
  const baseConfig = TOWER_CONFIGS[tower.type];
  let upgrade: Upgrade | null = null;
  if (pathIndex === 0 && tower.path1Tier < 5) {
    upgrade = baseConfig.upgrades.path1[tower.path1Tier];
  } else if (pathIndex === 1 && tower.path2Tier < 5) {
    upgrade = baseConfig.upgrades.path2[tower.path2Tier];
  } else if (pathIndex === 2 && tower.path3Tier < 5) {
    upgrade = baseConfig.upgrades.path3[tower.path3Tier];
  }
  if (!upgrade) {
    ctx.pushLog("Шлях уже повністю прокачано!");
    return;
  }
  const nextTier =
    pathIndex === 0
      ? tower.path1Tier + 1
      : pathIndex === 1
      ? tower.path2Tier + 1
      : tower.path3Tier + 1;
  if (
    nextTier >= 3 &&
    !isTierUnlocked(tower.type, pathIndex, nextTier, ctx.progressionRef.current)
  ) {
    ctx.pushLog(`Спочатку відкрийте ${tower.name} P${pathIndex + 1}T${nextTier} за Tower XP.`);
    return;
  }
  if (
    nextTier === 5 &&
    hasT5ForTowerPath(tower.type, pathIndex, tower.id, ctx)
  ) {
    ctx.pushLog(
      `Вже є Tier 5 для ${tower.name} на шляху ${pathIndex + 1}. Продайте його, щоб поставити інший.`
    );
    return;
  }
  if (ctx.goldRef.current < upgrade.cost) {
    ctx.pushLog("Недостатньо Nescafe Gold для апгрейду!");
    return;
  }
  const newStats = upgrade.effect(buildUpgradeStats(tower));
  ctx.setGold((prev) => prev - upgrade!.cost);
  tower.upgradesBought.push(upgrade.id);
  if (pathIndex === 0) tower.path1Tier++;
  else if (pathIndex === 1) tower.path2Tier++;
  else if (pathIndex === 2) tower.path3Tier++;
  if (nextTier === 5) ctx.awardAchievements(["first_t5"]);
  ctx.setProgression((prev) => {
    const mastery = prev.towerMastery[tower.type] ?? {
      towerXp: 0,
      unlockedTiers: [],
      highestTierAchieved: 2,
    };
    const next = normalizeProgression(
      {
        ...prev,
        towerMastery: {
          ...prev.towerMastery,
          [tower.type]: {
            ...mastery,
            highestTierAchieved: Math.max(mastery.highestTierAchieved, nextTier),
          },
        },
      },
      ctx.PROGRESSION_CONFIG
    );
    ctx.progressionRef.current = next;
    return next;
  });
  applyUpgradeStats(tower, newStats);
  tower.level += 1;
  if (upgrade.id === "candy_cheap") {
    ctx.setGold((prev) => prev + 40);
    ctx.spawnFloatingText(tower.x, tower.y - 35, `+40 ☕`, "#22c55e");
  }
  ctx.pushLog(`Апгрейд куплено: ${upgrade.name}!`);
  ctx.spawnFloatingText(tower.x, tower.y - 20, `-${upgrade.cost} ☕`, "#ef4444");
  ctx.spawnHitParticles(tower.x, tower.y, "#facc15", 16, "square");
  const explosionRingCap =
    ARRAY_CAPS.EXPLOSION_RINGS * (ctx.settingsRef.current.effectLimits ? 1 : 2);
  pushWithCap(ctx.explosionRingsRef.current, {
    x: tower.x, y: tower.y,
    radius: 10, maxRadius: tower.range,
    color: "#facc15",
    life: 30, coreLife: 30, ringCount: 2,
    debris: Array.from({ length: 8 }, () => ({
      x: tower.x, y: tower.y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      size: Math.random() * 3 + 1.5,
      life: 25, maxLife: 25,
      color: "#fef3c7",
    })),
  }, explosionRingCap);
  ctx.emitSound(SoundEvent.TOWER_UPGRADE);
  ctx.setSelectedTower({ ...tower });
}

// ─────────────────────────────────────────────────────────────────────────
//  Spawn enemy callback (called by the engine when a spawn is due)
// ─────────────────────────────────────────────────────────────────────────

export function spawnEnemyCallback(
  type: string,
  x: number,
  y: number,
  modifiers: EnemyModifier[] | undefined,
  routeId: string | undefined,
  ctx: Pick<TowerActionsConfig,
    "enemiesRef" | "waveRef" | "difficultyRef" | "selectedMapIdRef" | "getMapById"
  >
): void {
  const baseConfig = getEnemyStatsForWave(type, ctx.waveRef.current, modifiers);
  const activeMap = ctx.getMapById(ctx.selectedMapIdRef.current);
  const route = getRouteById(
    activeMap,
    routeId ?? getWaveRouteIds(activeMap, ctx.waveRef.current)[0]
  );
  let closestIndex = 0;
  let minDist = Infinity;
  for (let i = 0; i < route.points.length; i++) {
    const dist = getDistance(x, y, route.points[i].x, route.points[i].y);
    if (dist < minDist) {
      minDist = dist;
      closestIndex = i;
    }
  }
  const newEnemy: ActiveEnemy = {
    id: getPureId(),
    type,
    x,
    y,
    hp: baseConfig.hp,
    maxHp: baseConfig.hp,
    speed: baseConfig.speed,
    reward: baseConfig.reward,
    damage: baseConfig.damage,
    color: baseConfig.color,
    borderColor: baseConfig.borderColor,
    radius: baseConfig.radius,
    name: baseConfig.name,
    emoji: EMOJI_MAP[type] || "😐",
    routeId: route.id,
    pathIndex: Math.max(1, closestIndex),
    distanceTraveled: 0,
    slowDuration: 0,
    freezeDuration: 0,
    gasSlowDuration: 0,
    isArmored: baseConfig.isArmored,
    isSuperArmored: baseConfig.isSuperArmored,
    isGlitching: baseConfig.isGlitching,
    glitchDistance: baseConfig.glitchDistance,
    isSlowingTowers: baseConfig.isSlowingTowers,
    isSpawningTrail: baseConfig.isSpawningTrail,
    onDeath: baseConfig.onDeath,
    isCamo: baseConfig.isCamo,
    isRegen: baseConfig.isRegen,
    isLead: baseConfig.isLead,
    isCeramic: baseConfig.isCeramic,
    isPhantomCamo: baseConfig.isPhantomCamo,
    isExploder: baseConfig.isExploder,
    isHealer: baseConfig.isHealer,
    isFlying: baseConfig.isFlying,
    knockbackMultiplier: baseConfig.knockbackMultiplier,
    shieldHp: baseConfig.shieldHp,
    maxShieldHp: baseConfig.shieldHp,
    tier: baseConfig.tier,
    damageReduce: baseConfig.tier ? TIER_SCALING[baseConfig.tier - 1]?.damageReduce ?? 0 : 0,
    stunImmune: baseConfig.stunImmune,
    knockbackImmune: baseConfig.knockbackImmune,
  };
  ctx.enemiesRef.current.push(
    applyDifficultyToEnemy(newEnemy, ctx.difficultyRef.current)
  );
}
