"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  TOWER_CONFIGS,
  ENEMY_CONFIGS,
  getScaledWave,
  getEnemyStatsForWave,
  TIER_SCALING,
  GAME_WIDTH,
  GAME_HEIGHT,
  GAME_VERSION,
  PathPoint,
  Upgrade,
  UpgradeStats,
  EMOJI_MAP,
  SOUND_MAP,
  getWaveQuote,
  ACHIEVEMENTS,
  TIER_UNLOCK_COSTS,
  TOWER_UNLOCK_LEVELS,
  getEndlessXpMultiplier,
  getPlayerLevelForXp,
  getPlayerLevelProgress
} from "./gameConfig";
import type { EnemyModifier, Obstacle } from "./gameConfig";

interface PlacedTower {
  id: string;
  x: number;
  y: number;
  type: string;
  range: number;
  damage: number;
  fireRate: number;
  emoji: string;
  color: string;
  name: string;
  cooldown: number; // frames remaining until next shot
  upgradesBought: string[];
  path1Tier: number;
  path2Tier: number;
  path3Tier: number;
  level: number;
  totalKills: number;
  pierce: number;
  stunDuration?: number;
  // custom stats for upgrades
  twoHits?: boolean;
  critChance?: number;
  buffMultiplier?: number;
  endOfWaveBonus?: number;
  isAoESlow?: boolean;
  damageDebuff?: number;
  freezeChance?: number;
  slowAmount?: number;
  gachaChance?: number;
  copilotBug?: boolean;
  antiArmor?: boolean;
  shotCount?: number;
  tackCount?: number;
  // BTD6 upgrades stats
  ignoresArmor?: boolean;
  armorPierce?: number;
  alwaysDouble?: boolean;
  critMultiplier?: number;
  damageBuff?: number;
  rangeBuff?: number;
  ignoreArmorBuff?: number;
  rangeBuffPercent?: number;
  slowDurationBonus?: number;
  slowFactorBonus?: number;
  explodeDmg?: number;
  gachaDamageOverride?: number;
  freezeDurationBonus?: number;
  bsodAoE?: boolean;
  bugExplodeDmg?: number;
  bugExplodeRadius?: number;
  bugContagion?: boolean;
  disableGlitch?: boolean;
  disableAbilities?: boolean;
  camoDetection?: boolean;
  camoDetectionBuff?: boolean;
  maxMines?: number;
  knockbackChance?: number;
  knockbackDistance?: number;
  microStunDuration?: number;
  wallBounce?: boolean;
  tripleShot?: boolean;
  quadShot?: boolean;
  everyNthTriple?: number;
  spreadChance?: number;
  spreadDamageBonus?: number;
  gachaDamageMultiplier?: number;
  conditionalTripleWithPierce?: boolean;
  mineExplodes?: boolean;
  hasCamoBuff?: boolean;
  hasCoffeeBuff?: boolean;
  coffeeBuffStrength?: number; // 0-1 how strong the buff is (for visual intensity)
  coffeeDamageBonus?: number;
  coffeeRangeBonus?: number;
  coffeeRangeBuffPercent?: number;
  coffeeIgnoreArmorBuff?: number;
  coffeeBuffMultiplier?: number;
  targetingMode?: "first" | "last" | "strongest" | "nearest";
}

// Keys copied between PlacedTower and UpgradeStats during upgrade apply/preview.
const UPGRADE_STAT_KEYS: (keyof UpgradeStats)[] = [
  "range", "damage", "fireRate", "twoHits", "critChance", "buffMultiplier",
  "endOfWaveBonus", "isAoESlow", "damageDebuff", "freezeChance", "gachaChance",
  "copilotBug", "slowAmount", "antiArmor", "ignoresArmor", "alwaysDouble",
  "critMultiplier", "damageBuff", "rangeBuff", "ignoreArmorBuff", "rangeBuffPercent",
  "slowDurationBonus", "slowFactorBonus", "explodeDmg", "gachaDamageOverride",
  "freezeDurationBonus", "bsodAoE", "bugExplodeDmg", "bugExplodeRadius", "bugContagion",
  "disableGlitch", "disableAbilities", "camoDetection", "camoDetectionBuff", "pierce",
  "tackCount", "maxMines", "mineExplodes", "knockbackChance", "knockbackDistance",
  "microStunDuration", "wallBounce", "tripleShot", "quadShot", "everyNthTriple",
  "spreadChance", "spreadDamageBonus", "gachaDamageMultiplier", "conditionalTripleWithPierce"
];

function buildUpgradeStats(tower: PlacedTower): UpgradeStats {
  const stats: Partial<UpgradeStats> = {};
  UPGRADE_STAT_KEYS.forEach((key) => {
    (stats as any)[key] = (tower as any)[key];
  });
  return stats as UpgradeStats;
}

function applyUpgradeStats(tower: PlacedTower, stats: UpgradeStats) {
  UPGRADE_STAT_KEYS.forEach((key) => {
    if (key in stats) {
      (tower as any)[key] = stats[key];
    }
  });
  tower.pierce = stats.pierce || 1;
}


interface ActiveEnemy {
  id: string;
  type: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  damage: number;
  color: string;
  borderColor: string;
  radius: number;
  name: string;
  emoji: string;
  routeId: string;
  pathIndex: number;
  distanceTraveled: number;
  // Statuses
  slowDuration: number; // in frames
  candySlowFactor?: number;
  freezeDuration: number; // in frames
  gasSlowDuration: number; // in frames
  gasSlowFactor?: number;
  damageDebuff?: number; // multiplier
  abilitiesDisabledDuration?: number; // in frames
  hasCopilotBug?: boolean;
  bugExplodeDmg?: number;
  bugExplodeRadius?: number;
  bugContagion?: boolean;
  // Specials
  isArmored?: boolean;
  isSuperArmored?: boolean;
  isGlitching?: boolean;
  glitchDistance?: number;
  timeSinceGlitch?: number;
  isSlowingTowers?: boolean;
  isSpawningTrail?: boolean;
  onDeath?: (x: number, y: number, spawnCallback: (type: string, rx: number, ry: number, modifiers?: EnemyModifier[]) => void) => void;
  isCamo?: boolean;
  isRegen?: boolean;
  isLead?: boolean;
  shieldHp?: number;
  shieldRegenTimer?: number;
  isPhantomCamo?: boolean;
  isExploder?: boolean;
  isHealer?: boolean;
  isFlying?: boolean;
  knockbackMultiplier?: number;
  lastHitFrame?: number;
  tier?: number;
  damageReduce?: number;
  stunImmune?: boolean;
  knockbackImmune?: boolean;
}

interface Projectile {
  id: string;
  type: string;
  x: number;
  y: number;
  targetId: string;
  speed: number;
  damage: number;
  emoji: string;
  color: string;
  towerId?: string;
  // inherited stats
  critChance?: number;
  isAoESlow?: boolean;
  damageDebuff?: number;
  freezeChance?: number;
  slowAmount?: number;
  gachaChance?: number;
  copilotBug?: boolean;
  ignoresArmor?: boolean;
  armorPierce?: number;
  alwaysDouble?: boolean;
  critMultiplier?: number;
  slowDurationBonus?: number;
  slowFactorBonus?: number;
  explodeDmg?: number;
  gachaDamageOverride?: number;
  freezeDurationBonus?: number;
  bsodAoE?: boolean;
  disableGlitch?: boolean;
  disableAbilities?: boolean;
  antiArmor?: boolean;
  bugExplodeDmg?: number;
  bugExplodeRadius?: number;
  bugContagion?: boolean;
  camoDetection?: boolean;
  pierce: number;
  knockbackChance?: number;
  knockbackDistance?: number;
  microStunDuration?: number;
  wallBounce?: boolean;
  tripleShot?: boolean;
  quadShot?: boolean;
  everyNthTriple?: number;
  spreadChance?: number;
  spreadDamageBonus?: number;
  gachaDamageMultiplier?: number;
  conditionalTripleWithPierce?: boolean;
  hasBounced?: boolean;
  hitEnemyIds: string[];
  // simple physics
  angle: number;
  lastTargetX: number;
  lastTargetY: number;
  spinRotation?: number;
  travelDistance?: number;
  maxDistance?: number;
  // Boomerang-specific
  isReturning?: boolean;
  originX?: number;
  originY?: number;
  turnX?: number;
  turnY?: number;
  returnHitReset?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  shape?: "circle" | "square";
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  size?: number;
  font?: string;
}

interface SpeedTrail {
  x: number;
  y: number;
  radius: number;
  life: number;
}

interface Mine {
  id: string;
  x: number;
  y: number;
  damage: number;
  radius: number; // explosion radius
  triggerRadius: number; // how close enemy needs to be
  ignoresArmor?: boolean;
  armorPierce?: number;
  slowAmount?: number;
  freezeChance?: number;
  freezeDuration?: number;
  disableAbilities?: boolean;
  damageDebuff?: number;
  pierce: number; // max enemies hit / trap durability
  towerId: string;
  hitEnemyIds: string[]; // enemies already damaged by this trap
  explodes: boolean;
  camoDetection?: boolean;
}

interface MineProjectile {
  id: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  color: string;
  towerId: string;
}

// Pure helpers to satisfy react-hooks/purity ruleset checking for Math.random
const getPureRandom = () => Math.random();
const getPureId = () => Math.random().toString(36).substr(2, 9);

// BTD6 Crosspathing logic helper
const checkUpgradeAllowed = (path1: number, path2: number, path3: number, pathIndex: number): boolean => {
  const newTiers = [path1, path2, path3];
  newTiers[pathIndex]++;
  if (newTiers[pathIndex] > 5) return false;
  const activePaths = newTiers.filter(t => t > 0).length;
  const highTiers = newTiers.filter(t => t >= 3).length;
  return activePaths <= 2 && highTiers <= 1;
};

interface LeaderboardEntry {
  name: string;
  score: number;
  wave: number;
  date: string;
  isGlobal?: boolean;
  difficulty?: DifficultyKey;
  isEndless?: boolean;
  durationSeconds?: number | null;
  activeTitle?: string | null;
  activeFrame?: string | null;
  mapId?: string | null;
}

type LeaderboardKind = "best_score" | "normal_wave" | "hard_wave" | "endless_wave" | "fastest_victory";

const LEADERBOARD_TABS: { key: LeaderboardKind; label: string }[] = [
  { key: "best_score", label: "Score" },
  { key: "normal_wave", label: "Normal" },
  { key: "hard_wave", label: "Hard" },
  { key: "endless_wave", label: "Endless" },
  { key: "fastest_victory", label: "Fastest" },
];

type TowerMasteryProgress = {
  towerXp: number;
  unlockedTiers: string[];
  highestTierAchieved: number;
};

type ProgressionState = {
  playerLevel: number;
  totalXp: number;
  unlockedTowers: string[];
  achievements: string[];
  bonusStartGold: number;
  bonusLives: number;
  towerMastery: Record<string, TowerMasteryProgress>;
  mapCompletions: Record<string, DifficultyKey[]>;
  unlockedTitles: string[];
  unlockedFrames: string[];
  unlockedEffects: string[];
  activeTitle: string | null;
  activeFrame: string | null;
  activeEffect: string | null;
};

type AchievementToast = {
  id: string;
  name: string;
  description: string;
  reward: string;
};

type SessionSummary = {
  playerXp: number;
  towerXp: Record<string, number>;
  achievements: string[];
  startLevel: number;
  endLevel: number;
  startUnlockedTowers: string[];
  endUnlockedTowers: string[];
  durationSeconds: number;
  endlessMultiplier: number;
};

type DifficultyKey = "easy" | "normal" | "hard";

const DIFFICULTY_CONFIG: Record<DifficultyKey, { label: string; description: string; lives: number; gold: number; hpMult: number; speedMult: number; rewardMult: number }> = {
  easy: { label: "Легко", description: "+ресурси, м'якша братва", lives: 125, gold: 450, hpMult: 0.85, speedMult: 0.95, rewardMult: 1.1 },
  normal: { label: "Нормально", description: "чесний Коростишів", lives: 100, gold: 350, hpMult: 1, speedMult: 1, rewardMult: 1 },
  hard: { label: "Пекло", description: "братва без гальм", lives: 75, gold: 300, hpMult: 1.18, speedMult: 1.08, rewardMult: 0.92 }
};

type ObstacleConfig = Obstacle;

type RouteConfig = {
  id: string;
  name: string;
  points: PathPoint[];
};

type MapGate = {
  x: number;
  y: number;
  label: string;
  color: string;
  isExit?: boolean;
};

type MapDecorPatch = {
  x: number;
  y: number;
  r: number;
  color: string;
};

type MapConfig = {
  id: string;
  name: string;
  difficultyLabel: string;
  description: string;
  routes: RouteConfig[];
  gates: MapGate[];
  obstacles: ObstacleConfig[];
  decor: MapDecorPatch[];
  getWaveRoutes: (wave: number) => string[];
};

const easyRoute: PathPoint[] = [
  { x: 0, y: 125 },
  { x: 210, y: 125 },
  { x: 210, y: 300 },
  { x: 420, y: 300 },
  { x: 420, y: 145 },
  { x: 650, y: 145 },
  { x: 650, y: 385 },
  { x: 800, y: 385 },
];

const mediumForwardRoute: PathPoint[] = [
  { x: 0, y: 95 },
  { x: 320, y: 95 },
  { x: 320, y: 215 },
  { x: 115, y: 215 },
  { x: 115, y: 380 },
  { x: 560, y: 380 },
  { x: 560, y: 215 },
  { x: 800, y: 215 },
];

const hardRoutes: RouteConfig[] = [
  { id: "north_left", name: "North -> Core L", points: [{ x: 390, y: 0 }, { x: 390, y: 100 }, { x: 245, y: 100 }, { x: 245, y: 235 }, { x: 90, y: 235 }, { x: 90, y: 500 }] },
  { id: "west_right", name: "West -> Core R", points: [{ x: 0, y: 250 }, { x: 185, y: 250 }, { x: 185, y: 125 }, { x: 485, y: 125 }, { x: 485, y: 365 }, { x: 710, y: 365 }, { x: 710, y: 500 }] },
  { id: "south_right", name: "South -> Core R", points: [{ x: 430, y: 500 }, { x: 430, y: 385 }, { x: 600, y: 385 }, { x: 600, y: 250 }, { x: 710, y: 250 }, { x: 710, y: 500 }] },
  { id: "north_right", name: "North -> Core R", points: [{ x: 390, y: 0 }, { x: 390, y: 105 }, { x: 590, y: 105 }, { x: 590, y: 250 }, { x: 710, y: 250 }, { x: 710, y: 500 }] },
  { id: "west_left", name: "West -> Core L", points: [{ x: 0, y: 250 }, { x: 185, y: 250 }, { x: 185, y: 370 }, { x: 90, y: 370 }, { x: 90, y: 500 }] },
  { id: "south_left", name: "South -> Core L", points: [{ x: 430, y: 500 }, { x: 430, y: 380 }, { x: 245, y: 380 }, { x: 245, y: 235 }, { x: 90, y: 235 }, { x: 90, y: 500 }] },
];

const MAP_CONFIGS: MapConfig[] = [
  {
    id: "yard",
    name: "Коростишівський Двір",
    difficultyLabel: "Easy route",
    description: "Одна довга дорога, багато місця під башти і чесні choke points для першого проходження.",
    routes: [{ id: "main", name: "Двір -> Core", points: easyRoute }],
    gates: [
      { x: easyRoute[0].x + 18, y: easyRoute[0].y, label: "ENTRY", color: "#22c55e" },
      { x: easyRoute[easyRoute.length - 1].x - 18, y: easyRoute[easyRoute.length - 1].y, label: "CORE", color: "#38bdf8", isExit: true },
    ],
    obstacles: [
      { x: 315, y: 195, radius: 32, name: "Коростишівський Граніт", emoji: "", color: "#4b5563", borderColor: "#374151" },
      { x: 535, y: 305, radius: 30, name: "Озеро Nescafe", emoji: "", color: "#1d4ed8", borderColor: "#1e3a8a" },
      { x: 720, y: 115, radius: 24, name: "Зламаний Infinix", emoji: "", color: "#6b21a8", borderColor: "#581c87" },
    ],
    decor: [
      { x: 72, y: 314, r: 38, color: "rgba(63, 98, 48, 0.42)" },
      { x: 222, y: 58, r: 28, color: "rgba(69, 58, 39, 0.35)" },
      { x: 382, y: 176, r: 30, color: "rgba(58, 88, 46, 0.36)" },
      { x: 538, y: 334, r: 46, color: "rgba(44, 72, 48, 0.38)" },
      { x: 734, y: 76, r: 34, color: "rgba(65, 54, 43, 0.34)" },
      { x: 718, y: 452, r: 42, color: "rgba(38, 66, 42, 0.36)" },
    ],
    getWaveRoutes: () => ["main"],
  },
  {
    id: "two-way",
    name: "Двосторонній Накат",
    difficultyLabel: "Medium route",
    description: "Одна дорога між двома порталами: спершу A->B, потім реверс, далі хвилі з обох боків.",
    routes: [
      { id: "a_to_b", name: "Gate A -> Gate B", points: mediumForwardRoute },
      { id: "b_to_a", name: "Gate B -> Gate A", points: [...mediumForwardRoute].reverse() },
    ],
    gates: [
      { x: mediumForwardRoute[0].x + 18, y: mediumForwardRoute[0].y, label: "GATE A", color: "#22c55e" },
      { x: mediumForwardRoute[mediumForwardRoute.length - 1].x - 18, y: mediumForwardRoute[mediumForwardRoute.length - 1].y, label: "GATE B", color: "#f59e0b", isExit: true },
    ],
    obstacles: [
      { x: 225, y: 315, radius: 34, name: "Nescafe Crates", emoji: "", color: "#92400e", borderColor: "#451a03" },
      { x: 430, y: 255, radius: 42, name: "Складський Блок", emoji: "", color: "#4b5563", borderColor: "#27272a" },
      { x: 650, y: 120, radius: 28, name: "Озеро Nescafe", emoji: "", color: "#1d4ed8", borderColor: "#1e3a8a" },
    ],
    decor: [
      { x: 155, y: 65, r: 32, color: "rgba(120, 78, 28, 0.32)" },
      { x: 258, y: 440, r: 48, color: "rgba(77, 52, 33, 0.38)" },
      { x: 475, y: 72, r: 40, color: "rgba(65, 54, 43, 0.36)" },
      { x: 690, y: 330, r: 44, color: "rgba(38, 66, 42, 0.28)" },
    ],
    getWaveRoutes: (wave) => {
      if (wave <= 3) return ["a_to_b"];
      if (wave <= 6) return ["b_to_a"];
      if (wave <= 10) return [wave % 2 === 0 ? "a_to_b" : "b_to_a"];
      if (wave <= 20) return wave % 4 === 0 ? ["a_to_b", "b_to_a"] : [wave % 2 === 0 ? "a_to_b" : "b_to_a"];
      return wave % 3 === 0 ? ["a_to_b", "b_to_a"] : [wave % 2 === 0 ? "a_to_b" : "b_to_a"];
    },
  },
  {
    id: "infinix-junction",
    name: "Розв'язка Infinix",
    difficultyLabel: "Hard route",
    description: "Три входи і два виходи. Маршрути поступово міняються, а після середини гри комбінуються.",
    routes: hardRoutes,
    gates: [
      { x: 390, y: 24, label: "NORTH", color: "#22c55e" },
      { x: 24, y: 250, label: "WEST", color: "#22c55e" },
      { x: 430, y: 476, label: "SOUTH", color: "#22c55e" },
      { x: 90, y: 476, label: "CORE L", color: "#38bdf8", isExit: true },
      { x: 710, y: 476, label: "CORE R", color: "#38bdf8", isExit: true },
    ],
    obstacles: [
      { x: 345, y: 245, radius: 38, name: "Зламаний Infinix", emoji: "", color: "#6b21a8", borderColor: "#581c87" },
      { x: 540, y: 235, radius: 30, name: "Електрощит", emoji: "", color: "#0ea5e9", borderColor: "#075985" },
      { x: 235, y: 305, radius: 28, name: "Кабельна Котушка", emoji: "", color: "#4b5563", borderColor: "#1f2937" },
      { x: 640, y: 100, radius: 26, name: "Коростишівський Граніт", emoji: "", color: "#4b5563", borderColor: "#374151" },
    ],
    decor: [
      { x: 115, y: 112, r: 34, color: "rgba(59, 130, 246, 0.16)" },
      { x: 298, y: 438, r: 42, color: "rgba(168, 85, 247, 0.16)" },
      { x: 505, y: 55, r: 36, color: "rgba(34, 197, 94, 0.13)" },
      { x: 690, y: 315, r: 48, color: "rgba(6, 182, 212, 0.14)" },
    ],
    getWaveRoutes: (wave) => {
      if (wave <= 4) return ["north_left"];
      if (wave <= 8) return ["west_right"];
      if (wave <= 12) return ["south_right"];
      if (wave <= 20) return wave % 2 === 0 ? ["north_left", "south_right"] : ["west_left"];
      if (wave <= 35) return wave % 3 === 0 ? ["north_right", "west_left"] : ["south_left", "west_right"];
      return wave % 5 === 0 ? ["north_left", "west_right", "south_left"] : ["north_right", "south_right"];
    },
  },
];

const DEFAULT_MAP_ID = MAP_CONFIGS[0].id;

function getMapById(mapId: string) {
  return MAP_CONFIGS.find((map) => map.id === mapId) ?? MAP_CONFIGS[0];
}

function getRouteById(map: MapConfig, routeId: string) {
  return map.routes.find((route) => route.id === routeId) ?? map.routes[0];
}

function getWaveRouteIds(map: MapConfig, waveNumber: number) {
  const routeIds = map.getWaveRoutes(waveNumber).filter((routeId) => map.routes.some((route) => route.id === routeId));
  return routeIds.length > 0 ? routeIds : [map.routes[0].id];
}

function getRouteDistancePosition(points: PathPoint[], distance: number) {
  let remainingDist = Math.max(0, distance);
  let currentX = points[0].x;
  let currentY = points[0].y;
  let newPathIndex = 1;

  for (let p = 0; p < points.length - 1; p++) {
    const p1 = points[p];
    const p2 = points[p + 1];
    const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (remainingDist <= segLen) {
      const t = segLen > 0 ? remainingDist / segLen : 0;
      currentX = p1.x + (p2.x - p1.x) * t;
      currentY = p1.y + (p2.y - p1.y) * t;
      newPathIndex = p + 1;
      break;
    }
    remainingDist -= segLen;
    currentX = p2.x;
    currentY = p2.y;
    newPathIndex = p + 2;
  }

  if (newPathIndex >= points.length) {
    newPathIndex = points.length - 1;
    currentX = points[points.length - 1].x;
    currentY = points[points.length - 1].y;
  }

  return { x: currentX, y: currentY, pathIndex: newPathIndex };
}

const DEFAULT_SETTINGS = {
  volume: 0.75,
  screenShake: true,
  particles: true
};

const NON_ENDLESS_WAVE_COUNT = 46;

function getNonEndlessWaveClearReward(wave: number) {
  if (wave < 1 || wave > NON_ENDLESS_WAVE_COUNT) return 0;

  const earlyCatchUp = wave <= 8 ? Math.max(0, 90 - wave * 8) : 0;
  const progression = 40 + wave * 12;
  const milestone = Math.floor(wave / 5) * 25 + Math.floor(wave / 10) * 40;
  return progression + milestone + earlyCatchUp;
}

const LEADERBOARD_KEY = "brat_td_leaderboard";
const SETTINGS_KEY = "brat_td_settings";
const PROGRESSION_KEY = "brat_td_progress";
const SUPPORT_TOWER_TYPES = new Set(["coffee", "bankomat"]);
const isSupportTowerType = (type: string) => SUPPORT_TOWER_TYPES.has(type);

type SceneTheme = {
  skyTop: string;
  skyBottom: string;
  groundA: string;
  groundB: string;
  groundC: string;
  trackOuter: string;
  trackEdge: string;
  trackInner: string;
  trackLine: string;
  accent: string;
};

const SCENE_THEMES: SceneTheme[] = [
  { skyTop: "#071016", skyBottom: "#111a14", groundA: "#10170f", groundB: "#172416", groundC: "#22301c", trackOuter: "#070707", trackEdge: "#28231d", trackInner: "#4a4032", trackLine: "rgba(244, 218, 154, 0.36)", accent: "#38bdf8" },
  { skyTop: "#090b1e", skyBottom: "#171125", groundA: "#121026", groundB: "#1d1932", groundC: "#28203d", trackOuter: "#090813", trackEdge: "#2e293d", trackInner: "#514861", trackLine: "rgba(199, 210, 254, 0.34)", accent: "#818cf8" },
  { skyTop: "#1d0f04", skyBottom: "#251707", groundA: "#20150b", groundB: "#34230f", groundC: "#463016", trackOuter: "#0f0904", trackEdge: "#3d2a16", trackInner: "#5d4326", trackLine: "rgba(251, 191, 36, 0.34)", accent: "#f59e0b" },
  { skyTop: "#170514", skyBottom: "#210818", groundA: "#190d16", groundB: "#291220", groundC: "#3a1830", trackOuter: "#0b0509", trackEdge: "#3d2033", trackInner: "#57304b", trackLine: "rgba(244, 114, 182, 0.32)", accent: "#ec4899" },
  { skyTop: "#02180b", skyBottom: "#082116", groundA: "#07170c", groundB: "#102817", groundC: "#17351f", trackOuter: "#030a05", trackEdge: "#173120", trackInner: "#2f4a31", trackLine: "rgba(134, 239, 172, 0.30)", accent: "#22c55e" },
];

const MAP_DECOR = [
  { x: 72, y: 314, r: 38, color: "rgba(63, 98, 48, 0.42)" },
  { x: 222, y: 58, r: 28, color: "rgba(69, 58, 39, 0.35)" },
  { x: 382, y: 176, r: 30, color: "rgba(58, 88, 46, 0.36)" },
  { x: 538, y: 334, r: 46, color: "rgba(44, 72, 48, 0.38)" },
  { x: 734, y: 76, r: 34, color: "rgba(65, 54, 43, 0.34)" },
  { x: 718, y: 452, r: 42, color: "rgba(38, 66, 42, 0.36)" },
];

function colorWithAlpha(color: string, alpha: number) {
  if (!color.startsWith("#") || color.length !== 7) return color;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawSceneBackground(ctx: CanvasRenderingContext2D, theme: SceneTheme, frame: number, decor: MapDecorPatch[]) {
  const sky = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  sky.addColorStop(0, theme.skyTop);
  sky.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const ground = ctx.createRadialGradient(GAME_WIDTH * 0.55, GAME_HEIGHT * 0.42, 80, GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5, GAME_WIDTH * 0.82);
  ground.addColorStop(0, theme.groundC);
  ground.addColorStop(0.55, theme.groundB);
  ground.addColorStop(1, theme.groundA);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  decor.forEach((patch, index) => {
    const sway = Math.sin(frame * 0.01 + index) * 2;
    ctx.fillStyle = patch.color;
    ctx.beginPath();
    ctx.ellipse(patch.x + sway, patch.y, patch.r * 1.45, patch.r * 0.72, index * 0.45, 0, Math.PI * 2);
    ctx.fill();
  });

  for (let i = 0; i < 42; i++) {
    const x = (i * 137 + 31) % GAME_WIDTH;
    const y = (i * 83 + 57) % GAME_HEIGHT;
    const size = 2 + (i % 4);
    ctx.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.12)";
    ctx.fillRect(x, y, size, 1);
  }
}

function buildTrackPath(ctx: CanvasRenderingContext2D, points: PathPoint[]) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
}

function drawTrack(ctx: CanvasRenderingContext2D, theme: SceneTheme, frame: number, routes: RouteConfig[], activeRouteIds: string[]) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  routes.forEach((route) => {
    const isActive = activeRouteIds.includes(route.id);
    ctx.globalAlpha = isActive ? 1 : 0.62;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 8;
    buildTrackPath(ctx, route.points);
    ctx.lineWidth = 54;
    ctx.strokeStyle = theme.trackOuter;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    buildTrackPath(ctx, route.points);
    ctx.lineWidth = 46;
    ctx.strokeStyle = theme.trackEdge;
    ctx.stroke();

    buildTrackPath(ctx, route.points);
    ctx.lineWidth = 34;
    ctx.strokeStyle = theme.trackInner;
    ctx.stroke();

    buildTrackPath(ctx, route.points);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.stroke();

    buildTrackPath(ctx, route.points);
    ctx.lineWidth = isActive ? 2.5 : 1.5;
    ctx.strokeStyle = isActive ? theme.trackLine : "rgba(255,255,255,0.12)";
    ctx.setLineDash([18, 18]);
    ctx.lineDashOffset = -frame * 0.7;
    ctx.stroke();
    ctx.setLineDash([]);
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawGate(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, label: string, isExit = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 34, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#151515";
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  roundedRectPath(ctx, -26, -24, 52, 44, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = colorWithAlpha(color, isExit ? 0.22 : 0.18);
  roundedRectPath(ctx, -16, -14, 32, 25, 6);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.84)";
  ctx.font = "bold 8px var(--font-display)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

function drawObstacleSprite(ctx: CanvasRenderingContext2D, obs: ObstacleConfig) {
  ctx.save();
  ctx.translate(obs.x, obs.y);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, obs.radius * 0.55, obs.radius * 1.1, obs.radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  if (obs.name.includes("Озеро")) {
    const water = ctx.createRadialGradient(-8, -8, 4, 0, 0, obs.radius);
    water.addColorStop(0, "#67e8f9");
    water.addColorStop(0.45, obs.color);
    water.addColorStop(1, "#082f49");
    ctx.fillStyle = water;
    ctx.strokeStyle = "#bae6fd";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, obs.radius * 1.15, obs.radius * 0.78, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.34)";
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 11, -2 + i * 4, obs.radius * 0.28, 4, -0.1, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (obs.name.includes("Infinix")) {
    ctx.rotate(-0.25);
    ctx.fillStyle = "#111827";
    ctx.strokeStyle = obs.borderColor;
    ctx.lineWidth = 3;
    roundedRectPath(ctx, -18, -28, 36, 56, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#3b0764";
    roundedRectPath(ctx, -13, -21, 26, 39, 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(216,180,254,0.55)";
    ctx.beginPath();
    ctx.moveTo(-10, -14);
    ctx.lineTo(12, 6);
    ctx.moveTo(9, -15);
    ctx.lineTo(-7, 15);
    ctx.stroke();
    ctx.fillStyle = "#a855f7";
    ctx.fillRect(-5, 21, 10, 2);
  } else {
    ctx.fillStyle = obs.color;
    ctx.strokeStyle = obs.borderColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-obs.radius * 0.9, obs.radius * 0.25);
    ctx.lineTo(-obs.radius * 0.55, -obs.radius * 0.75);
    ctx.lineTo(obs.radius * 0.05, -obs.radius * 0.95);
    ctx.lineTo(obs.radius * 0.82, -obs.radius * 0.2);
    ctx.lineTo(obs.radius * 0.62, obs.radius * 0.58);
    ctx.lineTo(-obs.radius * 0.25, obs.radius * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-obs.radius * 0.45, -obs.radius * 0.35);
    ctx.lineTo(obs.radius * 0.02, -obs.radius * 0.18);
    ctx.lineTo(obs.radius * 0.38, -obs.radius * 0.55);
    ctx.stroke();
  }

  ctx.restore();
}

function drawMineSprite(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, pulse = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.45, size * 1.25, size * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colorWithAlpha(color, 0.82);
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `rgba(255,255,255,${0.55 * pulse})`;
  ctx.fillRect(-2, -size - 4, 4, 5);
  ctx.restore();
}

function drawTowerSprite(ctx: CanvasRenderingContext2D, tower: PlacedTower, angle: number, selected: boolean) {
  ctx.save();
  ctx.translate(tower.x, tower.y);

  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.beginPath();
  ctx.ellipse(0, 16, 23, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111214";
  ctx.strokeStyle = selected ? "#ffffff" : colorWithAlpha(tower.color, 0.92);
  ctx.lineWidth = selected ? 3 : 2;
  ctx.beginPath();
  ctx.arc(0, 0, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = colorWithAlpha(tower.color, 0.18);
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();

  if (tower.level > 1) {
    ctx.strokeStyle = colorWithAlpha(tower.color, 0.65);
    ctx.lineWidth = Math.min(5, 1 + tower.level * 0.7);
    ctx.beginPath();
    ctx.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + Math.min(1, tower.level / 5) * Math.PI * 2);
    ctx.stroke();
  }

  ctx.rotate(angle);
  ctx.fillStyle = tower.color;
  ctx.strokeStyle = "#020617";
  ctx.lineWidth = 2;

  switch (tower.type) {
    case "hammer":
      roundedRectPath(ctx, -6, -8, 16, 16, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#cbd5e1";
      roundedRectPath(ctx, 7, -4, 22, 8, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#64748b";
      roundedRectPath(ctx, 25, -8, 9, 16, 2);
      ctx.fill();
      break;
    case "boomerang":
      ctx.strokeStyle = tower.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(5, 0, 15, -1.15, 1.15);
      ctx.stroke();
      ctx.strokeStyle = "#fef3c7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(5, 0, 10, -1, 1);
      ctx.stroke();
      break;
    case "coffee":
      ctx.rotate(-angle);
      ctx.fillStyle = "#facc15";
      roundedRectPath(ctx, -11, -7, 22, 18, 4);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(12, 2, 6, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 5, -13);
        ctx.quadraticCurveTo(i * 5 + 3, -18, i * 5, -23);
        ctx.stroke();
      }
      break;
    case "candy":
      roundedRectPath(ctx, -8, -7, 28, 14, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fed7aa";
      ctx.beginPath();
      ctx.arc(20, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "infinix":
      ctx.rotate(-angle * 0.3);
      ctx.fillStyle = "#1f1235";
      roundedRectPath(ctx, -9, -14, 18, 28, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#a855f7";
      ctx.fillRect(-5, -8, 10, 13);
      ctx.strokeStyle = "#d8b4fe";
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.lineTo(0, -25);
      ctx.moveTo(-7, -22);
      ctx.lineTo(7, -22);
      ctx.stroke();
      break;
    case "gas":
      ctx.rotate(-angle);
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        ctx.save();
        ctx.rotate(a);
        roundedRectPath(ctx, 5, -3, 14, 6, 3);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = "#052e16";
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case "sniper":
      roundedRectPath(ctx, -7, -6, 18, 12, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#0f172a";
      roundedRectPath(ctx, 8, -3, 32, 6, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fda4af";
      ctx.beginPath();
      ctx.arc(2, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "chain":
      ctx.rotate(-angle);
      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-8, 9);
      ctx.lineTo(-3, -1);
      ctx.lineTo(4, 5);
      ctx.lineTo(9, -10);
      ctx.stroke();
      ctx.fillStyle = "#0ea5e9";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "kladmen":
      ctx.rotate(-angle);
      ctx.fillStyle = "#7f1d1d";
      roundedRectPath(ctx, -12, -10, 24, 20, 4);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#fecaca";
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.moveTo(0, -7);
      ctx.lineTo(0, 7);
      ctx.stroke();
      break;
    case "bankomat":
      ctx.rotate(-angle);
      ctx.fillStyle = "#1e293b";
      roundedRectPath(ctx, -13, -16, 26, 32, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#facc15";
      ctx.fillRect(-8, -9, 16, 7);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(-6, 5, 12, 3);
      break;
    case "monolith":
      ctx.rotate(-angle);
      ctx.fillStyle = "#52525b";
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(12, 12);
      ctx.lineTo(-12, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#d4d4d8";
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(4, 8);
      ctx.stroke();
      break;
    default:
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
  }

  ctx.restore();
}

function drawTowerMini(ctx: CanvasRenderingContext2D, x: number, y: number, type: string, color: string, alpha = 1) {
  const tower: PlacedTower = {
    id: "preview",
    x,
    y,
    type,
    range: 0,
    damage: 0,
    fireRate: 0,
    emoji: "",
    color,
    name: "",
    cooldown: 0,
    upgradesBought: [],
    path1Tier: 0,
    path2Tier: 0,
    path3Tier: 0,
    level: 1,
    totalKills: 0,
    pierce: 1,
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  drawTowerSprite(ctx, tower, 0, false);
  ctx.restore();
}

function drawEnemySprite(ctx: CanvasRenderingContext2D, enemy: ActiveEnemy, frame: number) {
  const r = enemy.radius;
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (enemy.isCamo) ctx.globalAlpha = enemy.isPhantomCamo ? 0.52 : 0.72;

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.78, r * 1.05, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  const fill = enemy.color;
  const stroke = enemy.borderColor;
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(2, r * 0.12);

  if (enemy.type === "granite") {
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.35);
    ctx.lineTo(-r * 0.58, -r * 0.62);
    ctx.lineTo(0, -r);
    ctx.lineTo(r * 0.8, -r * 0.22);
    ctx.lineTo(r * 0.6, r * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (enemy.type === "matryoshka" || enemy.type === "big_matryoshka") {
    ctx.beginPath();
    ctx.ellipse(0, r * 0.08, r * 0.75, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = colorWithAlpha("#ffffff", 0.18);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.24, r * 0.38, r * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === "phantom") {
    ctx.fillStyle = colorWithAlpha(fill, 0.72);
    ctx.beginPath();
    ctx.arc(0, -r * 0.12, r * 0.78, Math.PI, 0);
    ctx.lineTo(r * 0.68, r * 0.65);
    ctx.quadraticCurveTo(r * 0.3, r * 0.35, 0, r * 0.68);
    ctx.quadraticCurveTo(-r * 0.3, r * 0.35, -r * 0.68, r * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (enemy.type === "exploder") {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#fed7aa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.82);
    ctx.quadraticCurveTo(r * 0.35, -r * 1.25, r * 0.72, -r * 0.9);
    ctx.stroke();
  } else {
    const lean = enemy.type === "fast" || enemy.type === "jumper" ? -0.18 : 0;
    ctx.rotate(lean);
    roundedRectPath(ctx, -r * 0.62, -r * 0.28, r * 1.24, r * 1.08, r * 0.32);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -r * 0.68, r * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(-lean);
  }

  ctx.fillStyle = "rgba(0,0,0,0.36)";
  ctx.beginPath();
  ctx.arc(-r * 0.2, -r * 0.68, Math.max(1.4, r * 0.08), 0, Math.PI * 2);
  ctx.arc(r * 0.22, -r * 0.68, Math.max(1.4, r * 0.08), 0, Math.PI * 2);
  ctx.fill();

  if (enemy.isArmored || enemy.isSuperArmored || enemy.isLead) {
    ctx.strokeStyle = enemy.isSuperArmored ? "#e5e7eb" : "#93c5fd";
    ctx.lineWidth = enemy.isSuperArmored ? 4 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95, -2.55, -0.6);
    ctx.stroke();
  }

  if (enemy.shieldHp && enemy.shieldHp > 0) {
    ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r + 5, -Math.PI * 0.8, Math.PI * 0.8);
    ctx.stroke();
  }

  if (enemy.type === "infinix_brat" || enemy.isGlitching) {
    ctx.strokeStyle = colorWithAlpha("#d8b4fe", 0.65);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const offset = Math.sin(frame * 0.12 + i) * 3;
      ctx.strokeRect(-r * 0.75 + i * r * 0.5 + offset, -r * 1.02 + i * 2, r * 0.28, r * 0.18);
    }
  }

  if (enemy.isRegen || enemy.isHealer) {
    ctx.strokeStyle = enemy.isHealer ? "rgba(74,222,128,0.72)" : "rgba(244,114,182,0.62)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(4, -2);
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 2);
    ctx.stroke();
  }

  if (enemy.type === "boss" || enemy.type === "megaboss") {
    ctx.fillStyle = "#fef2f2";
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 1.02);
    ctx.lineTo(-r * 0.25, -r * 1.55);
    ctx.lineTo(0, -r * 1.02);
    ctx.lineTo(r * 0.25, -r * 1.55);
    ctx.lineTo(r * 0.55, -r * 1.02);
    ctx.fill();
  }

  ctx.restore();
}

function drawProjectileSprite(ctx: CanvasRenderingContext2D, proj: Projectile) {
  ctx.save();
  ctx.translate(proj.x, proj.y);
  ctx.rotate(proj.spinRotation ?? proj.angle);
  ctx.strokeStyle = "#020617";
  ctx.lineWidth = 1.5;

  switch (proj.type) {
    case "hammer":
      ctx.fillStyle = "#cbd5e1";
      roundedRectPath(ctx, -5, -4, 18, 8, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = proj.color;
      roundedRectPath(ctx, 10, -8, 8, 16, 2);
      ctx.fill();
      break;
    case "boomerang":
      ctx.strokeStyle = proj.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 9, -1.1, 1.25);
      ctx.stroke();
      break;
    case "gas":
      ctx.fillStyle = colorWithAlpha(proj.color, 0.78);
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-5, -5);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fill();
      break;
    case "candy":
      ctx.fillStyle = "#fed7aa";
      roundedRectPath(ctx, -7, -5, 14, 10, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = proj.color;
      ctx.fillRect(-2, -5, 4, 10);
      break;
    case "infinix":
      ctx.fillStyle = colorWithAlpha(proj.color, 0.85);
      roundedRectPath(ctx, -9, -3, 18, 6, 2);
      ctx.fill();
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(-14, -1, 28, 2);
      break;
    case "sniper":
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(-7, -4);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-7, 4);
      ctx.closePath();
      ctx.fill();
      break;
    case "chain":
      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(-4, -5);
      ctx.lineTo(2, 4);
      ctx.lineTo(12, -2);
      ctx.stroke();
      break;
    default:
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
  }

  ctx.restore();
}

function getDefaultProgression(): ProgressionState {
  const towerMastery = Object.fromEntries(Object.keys(TOWER_CONFIGS).map((towerType) => [
    towerType,
    { towerXp: 0, unlockedTiers: [], highestTierAchieved: 2 },
  ]));
  return {
    playerLevel: 1,
    totalXp: 0,
    unlockedTowers: ["hammer", "boomerang"],
    achievements: [],
    bonusStartGold: 0,
    bonusLives: 0,
    towerMastery,
    mapCompletions: Object.fromEntries(MAP_CONFIGS.map((map) => [map.id, [] as DifficultyKey[]])),
    unlockedTitles: [],
    unlockedFrames: [],
    unlockedEffects: [],
    activeTitle: null,
    activeFrame: null,
    activeEffect: null,
  };
}

function getAchievementCosmetics(achievementIds: string[]) {
  const titles: string[] = [];
  const frames: string[] = [];
  const effects: string[] = [];
  achievementIds.forEach((id) => {
    const reward = ACHIEVEMENTS.find((a) => a.id === id)?.reward;
    if (reward?.title) titles.push(reward.title);
    if (reward?.frame) frames.push(reward.frame);
    if (reward?.effect) effects.push(reward.effect);
  });
  return { titles, frames, effects };
}

function normalizeProgression(progress?: Partial<ProgressionState> | null): ProgressionState {
  const base = getDefaultProgression();
  const totalXp = Math.max(0, Math.floor(progress?.totalXp ?? base.totalXp));
  const playerLevel = getPlayerLevelForXp(totalXp);
  const unlockedByLevel = Object.entries(TOWER_UNLOCK_LEVELS)
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
  const mapCompletions = Object.fromEntries(MAP_CONFIGS.map((map) => [map.id, [] as DifficultyKey[]])) as Record<string, DifficultyKey[]>;
  Object.entries(progress?.mapCompletions ?? {}).forEach(([mapId, completions]) => {
    if (!MAP_CONFIGS.some((map) => map.id === mapId) || !Array.isArray(completions)) return;
    mapCompletions[mapId] = Array.from(new Set(completions.filter((key): key is DifficultyKey => key === "easy" || key === "normal" || key === "hard")));
  });
  const achievements = Array.from(new Set(progress?.achievements ?? []));
  const cosmetics = getAchievementCosmetics(achievements);
  const unlockedTitles = Array.from(new Set([...(progress?.unlockedTitles ?? []), ...cosmetics.titles]));
  const unlockedFrames = Array.from(new Set([...(progress?.unlockedFrames ?? []), ...cosmetics.frames]));
  const unlockedEffects = Array.from(new Set([...(progress?.unlockedEffects ?? []), ...cosmetics.effects]));
  return {
    playerLevel,
    totalXp,
    unlockedTowers: Array.from(new Set([...(progress?.unlockedTowers ?? []), ...unlockedByLevel, "hammer", "boomerang"])),
    achievements,
    bonusStartGold: Math.min(500, Math.max(0, Math.floor(progress?.bonusStartGold ?? 0))),
    bonusLives: Math.max(0, Math.floor(progress?.bonusLives ?? 0)),
    towerMastery,
    mapCompletions,
    unlockedTitles,
    unlockedFrames,
    unlockedEffects,
    activeTitle: progress?.activeTitle && unlockedTitles.includes(progress.activeTitle) ? progress.activeTitle : null,
    activeFrame: progress?.activeFrame && unlockedFrames.includes(progress.activeFrame) ? progress.activeFrame : null,
    activeEffect: progress?.activeEffect && unlockedEffects.includes(progress.activeEffect) ? progress.activeEffect : null,
  };
}

function mergeProgression(a: ProgressionState, b: ProgressionState): ProgressionState {
  const totalXp = Math.max(a.totalXp, b.totalXp);
  const achievements = Array.from(new Set([...a.achievements, ...b.achievements]));
  const towerMastery = { ...a.towerMastery };
  Object.entries(b.towerMastery).forEach(([towerType, mastery]) => {
    const current = towerMastery[towerType] ?? { towerXp: 0, unlockedTiers: [], highestTierAchieved: 2 };
    towerMastery[towerType] = {
      towerXp: Math.max(current.towerXp, mastery.towerXp),
      unlockedTiers: Array.from(new Set([...current.unlockedTiers, ...mastery.unlockedTiers])),
      highestTierAchieved: Math.max(current.highestTierAchieved, mastery.highestTierAchieved),
    };
  });
  return normalizeProgression({
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
    mapCompletions: Object.fromEntries(MAP_CONFIGS.map((map) => [
      map.id,
      Array.from(new Set([...(a.mapCompletions[map.id] ?? []), ...(b.mapCompletions[map.id] ?? [])])),
    ])),
  });
}

function loadLocalProgression(): ProgressionState {
  if (typeof window === "undefined") return getDefaultProgression();
  try {
    const raw = localStorage.getItem(PROGRESSION_KEY);
    return normalizeProgression(raw ? JSON.parse(raw) : null);
  } catch {
    return getDefaultProgression();
  }
}

function saveLocalProgression(progress: ProgressionState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROGRESSION_KEY, JSON.stringify(progress));
  } catch {}
}

function getTierUnlockKey(pathIndex: number, tier: number) {
  return `${pathIndex + 1}:${tier}`;
}

function formatAchievementReward(reward: { bonusStartGold?: number; bonusLives?: number; title?: string; frame?: string; effect?: string }) {
  const parts: string[] = [];
  if (reward.bonusStartGold) parts.push(`+${reward.bonusStartGold} старт ☕`);
  if (reward.bonusLives) parts.push(`+${reward.bonusLives} ❤️`);
  if (reward.title) parts.push(`титул: ${reward.title}`);
  if (reward.frame) parts.push(`рамка: ${reward.frame}`);
  if (reward.effect) parts.push("ефект T5");
  return parts.join(" · ") || "косметика";
}

function formatSeconds(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SessionSummaryPanel({ summary }: { summary: SessionSummary }) {
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

function LeaderboardPreview({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="w-full max-w-xs mb-4 text-left">
      <p className="micro-cap text-ink-mute mb-2 text-center">ЛЕДЕРБОРД</p>
      <div className="bg-zinc-900/80 border border-hairline-dark rounded p-2 max-h-48 overflow-y-auto">
        {entries.map((e, i) => (
          <div key={i} className={`flex items-center justify-between py-1 px-2 text-xs ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-on-primary-mute"}`}>
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-5 text-right font-bold shrink-0">{i + 1}.</span>
              <span className="truncate">
                {e.activeTitle && <span className="text-cyan-300 mr-1">[{e.activeTitle}]</span>}
                {e.name}
              </span>
            </span>
            <span className="font-bold shrink-0">{e.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function loadSettings() {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      volume: typeof parsed.volume === "number" ? Math.max(0, Math.min(1, parsed.volume)) : DEFAULT_SETTINGS.volume,
      screenShake: typeof parsed.screenShake === "boolean" ? parsed.screenShake : DEFAULT_SETTINGS.screenShake,
      particles: typeof parsed.particles === "boolean" ? parsed.particles : DEFAULT_SETTINGS.particles
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: typeof DEFAULT_SETTINGS) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

function getLocalLeaderboard(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) {
      const defaults: LeaderboardEntry[] = [
        { name: "Петро Хоменко", score: 22000, wave: 46, date: "2026-06-12" }
      ];
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(raw) as LeaderboardEntry[];
  } catch {
    return [];
  }
}

function saveLocalLeaderboard(entries: LeaderboardEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}

function addToLocalLeaderboard(name: string, score: number, wave: number): LeaderboardEntry[] {
  const entries = getLocalLeaderboard();
  const progress = loadLocalProgression();
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

async function fetchGlobalLeaderboard(kind: LeaderboardKind = "best_score"): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`/api/brat-td?leaderboard=${kind}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.leaderboard ?? []).map((e: { player_name: string; score: number; wave: number; created_at: string; difficulty?: DifficultyKey; is_endless?: boolean; duration_seconds?: number | null; active_title?: string | null; active_frame?: string | null; map_id?: string | null }) => ({
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
    }));
  } catch {
    return [];
  }
}

async function fetchBratTdData(kind: LeaderboardKind = "best_score"): Promise<{ leaderboard: LeaderboardEntry[]; progress: ProgressionState | null }> {
  try {
    const res = await fetch(`/api/brat-td?leaderboard=${kind}`);
    if (!res.ok) return { leaderboard: [], progress: null };
    const data = await res.json();
    return {
      leaderboard: (data.leaderboard ?? []).map((e: { player_name: string; score: number; wave: number; created_at: string; difficulty?: DifficultyKey; is_endless?: boolean; duration_seconds?: number | null; active_title?: string | null; active_frame?: string | null; map_id?: string | null }) => ({
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
      })),
      progress: data.progress ? normalizeProgression(data.progress) : null,
    };
  } catch {
    return { leaderboard: [], progress: null };
  }
}

async function saveCloudProgression(progress: ProgressionState): Promise<boolean> {
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

async function submitGlobalScore(playerName: string, score: number, wave: number, meta: { difficulty: DifficultyKey; isEndless: boolean; durationSeconds: number; version: string; activeTitle: string | null; activeFrame: string | null; mapId: string }): Promise<boolean> {
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

function mergeLeaderboards(global: LeaderboardEntry[], local: LeaderboardEntry[]): LeaderboardEntry[] {
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

export default function BratTDClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- REACT STATE FOR UI ---
  const [lives, setLives] = useState(100);
  const [gold, setGold] = useState(350);
  const [wave, setWave] = useState(1);
  const [isWaveActive, setIsWaveActive] = useState(false);
  const [gameStatus, setGameStatus] = useState<"idle" | "playing" | "gameover" | "victory">("idle");
  const [isPaused, setIsPaused] = useState(false);
  const [gameSpeed, setGameSpeed] = useState<1 | 2 | 3>(1);
  const [isEndless, setIsEndless] = useState(false);
  const [isAutoStart, setIsAutoStart] = useState(false);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState<DifficultyKey>("normal");
  const [selectedMapId, setSelectedMapId] = useState(DEFAULT_MAP_ID);
  const [settings, setSettings] = useState<typeof DEFAULT_SETTINGS>(loadSettings);
  
  const [selectedShopTower, setSelectedShopTower] = useState<string | null>(null);
  const [selectedPlacedTowerId, setSelectedPlacedTowerId] = useState<string | null>(null);
  const [selectedTower, setSelectedTower] = useState<PlacedTower | null>(null);
  const [statusMessage, setStatusMessage] = useState("Подро почув накати братви. Підготуйте оборону!");

  // Mouse hover details (for previewing placement)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMouseOnCanvas, setIsMouseOnCanvas] = useState(false);
  const [draggedTowerType, setDraggedTowerType] = useState<string | null>(null);
  const [draggedTowerPos, setDraggedTowerPos] = useState<{ x: number; y: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardKind, setLeaderboardKind] = useState<LeaderboardKind>("best_score");
  const [playerName, setPlayerName] = useState("");
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [progression, setProgression] = useState<ProgressionState>(() => getDefaultProgression());
  const [progressionLoaded, setProgressionLoaded] = useState(false);
  const [achievementToasts, setAchievementToasts] = useState<AchievementToast[]>([]);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);

  const selectedShopTowerRef = useRef<string | null>(null);
  const hoveredShopTowerRef = useRef<string | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isMouseOnCanvasRef = useRef(false);
  const draggedTowerTypeRef = useRef<string | null>(null);
  const draggedTowerPosRef = useRef<{ x: number; y: number } | null>(null);
  const difficultyRef = useRef<DifficultyKey>("normal");
  const selectedMapIdRef = useRef(DEFAULT_MAP_ID);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const progressionRef = useRef<ProgressionState>(getDefaultProgression());
  const waveStartLivesRef = useRef(100);
  const waveKillsRef = useRef(0);
  const gameStartFrameRef = useRef(0);
  const sessionPlayerXpRef = useRef(0);
  const sessionTowerXpRef = useRef<Record<string, number>>({});
  const sessionAchievementsRef = useRef<string[]>([]);
  const sessionStartLevelRef = useRef(1);
  const sessionStartUnlockedTowersRef = useRef<string[]>(["hammer", "boomerang"]);
  const sessionSummaryDoneRef = useRef(false);

  // --- GAME REFS FOR HIGH-FPS LOOP ---
  const towersRef = useRef<PlacedTower[]>([]);
  const enemiesRef = useRef<ActiveEnemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const mineProjectilesRef = useRef<MineProjectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const speedTrailsRef = useRef<SpeedTrail[]>([]);
  const minesRef = useRef<Mine[]>([]);

  // Synchronized refs for the requestAnimationFrame loop to prevent stale values
  const livesRef = useRef(100);
  const goldRef = useRef(350);
  const waveRef = useRef(1);
  const isWaveActiveRef = useRef(false);
  const gameStatusRef = useRef<"idle" | "playing" | "gameover" | "victory">("idle");
  const isPausedRef = useRef(false);
  const gameSpeedRef = useRef<1 | 2 | 3>(1);
  const isAutoStartRef = useRef(false);
  const scoreRef = useRef(0);
  const frameCountRef = useRef(0);
  const screenShakeRef = useRef({ x: 0, y: 0, intensity: 0, duration: 0 });
  const projectileTrailRef = useRef<{ x: number; y: number; color: string; alpha: number; size: number }[]>([]);
  const explosionRingsRef = useRef<{ x: number; y: number; radius: number; maxRadius: number; color: string; life: number }[]>([]);
  const waveAnnouncementRef = useRef<{ wave: number; frameStart: number } | null>(null);

  // Spawner tracking
  const spawnQueueRef = useRef<{ type: string; delay: number; modifiers?: EnemyModifier[]; routeId?: string }[]>([]);
  const spawnTimerRef = useRef<number>(0);
  const waveTotalEnemiesRef = useRef<number>(0);
  const waveTotalHpRef = useRef<number>(0);

  // Keep refs in sync with state
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { goldRef.current = gold; }, [gold]);
  useEffect(() => { waveRef.current = wave; }, [wave]);
  useEffect(() => { isWaveActiveRef.current = isWaveActive; }, [isWaveActive]);
  useEffect(() => { gameStatusRef.current = gameStatus; }, [gameStatus]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { gameSpeedRef.current = gameSpeed; }, [gameSpeed]);
  useEffect(() => { isAutoStartRef.current = isAutoStart; }, [isAutoStart]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { selectedShopTowerRef.current = selectedShopTower; }, [selectedShopTower]);
  useEffect(() => { mousePosRef.current = mousePos; }, [mousePos]);
  useEffect(() => { isMouseOnCanvasRef.current = isMouseOnCanvas; }, [isMouseOnCanvas]);
  useEffect(() => { draggedTowerTypeRef.current = draggedTowerType; }, [draggedTowerType]);
  useEffect(() => { draggedTowerPosRef.current = draggedTowerPos; }, [draggedTowerPos]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { selectedMapIdRef.current = selectedMapId; }, [selectedMapId]);
  useEffect(() => { settingsRef.current = settings; saveSettings(settings); }, [settings]);
  useEffect(() => { progressionRef.current = progression; }, [progression]);

  // Load leaderboard and progression on mount (API + localStorage merge)
  useEffect(() => {
    const load = async () => {
      const local = getLocalLeaderboard();
      const { leaderboard: global, progress } = await fetchBratTdData(leaderboardKind);
      setLeaderboard(mergeLeaderboards(global, local));
      const localProgress = loadLocalProgression();
      const mergedProgress = progress ? mergeProgression(localProgress, progress) : localProgress;
      setProgression(mergedProgress);
      progressionRef.current = mergedProgress;
      setProgressionLoaded(true);
    };
    load();
  }, []);

  useEffect(() => {
    const loadLeaderboard = async () => {
      const local = leaderboardKind === "best_score" ? getLocalLeaderboard() : [];
      const global = await fetchGlobalLeaderboard(leaderboardKind);
      setLeaderboard(mergeLeaderboards(global, local));
    };
    loadLeaderboard();
  }, [leaderboardKind]);

  useEffect(() => {
    if (!progressionLoaded) return;
    saveLocalProgression(progression);
    const timeout = window.setTimeout(() => {
      saveCloudProgression(progression);
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [progression, progressionLoaded]);

  // Audio helper
  const playTowerSound = (towerType?: string) => {
    try {
      if (settingsRef.current.volume <= 0) return;
      const sound = SOUND_MAP[towerType ?? ""] ?? { file: "/PDR_PRODUCTION_SOUND.mp3", volume: 0.45 };
      const audio = new Audio(sound.file);
      audio.volume = Math.min(1, sound.volume * settingsRef.current.volume);
      audio.play().catch(() => {});
    } catch {}
  };
  const playPdrSound = () => playTowerSound();

  // Set status message with log
  const pushLog = (msg: string) => {
    setStatusMessage(msg);
  };

  const enqueueAchievementToast = (achievementId: string) => {
    const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!achievement) return;
    const toast: AchievementToast = {
      id: `${achievement.id}-${Date.now()}`,
      name: achievement.name,
      description: achievement.description,
      reward: formatAchievementReward(achievement.reward),
    };
    setAchievementToasts((prev) => [...prev.slice(-2), toast]);
    window.setTimeout(() => {
      setAchievementToasts((prev) => prev.filter((item) => item.id !== toast.id));
    }, 4800);
  };

  const buildSessionSummary = () => {
    if (sessionSummaryDoneRef.current) return;
    sessionSummaryDoneRef.current = true;
    const endProgress = progressionRef.current;
    setSessionSummary({
      playerXp: sessionPlayerXpRef.current,
      towerXp: { ...sessionTowerXpRef.current },
      achievements: [...sessionAchievementsRef.current],
      startLevel: sessionStartLevelRef.current,
      endLevel: endProgress.playerLevel,
      startUnlockedTowers: [...sessionStartUnlockedTowersRef.current],
      endUnlockedTowers: [...endProgress.unlockedTowers],
      durationSeconds: Math.max(0, Math.floor((frameCountRef.current - gameStartFrameRef.current) / 60)),
      endlessMultiplier: getEndlessXpMultiplier(waveRef.current),
    });
  };

  const getActiveMap = () => getMapById(selectedMapIdRef.current);
  const getEnemyRoute = (enemy: ActiveEnemy) => getRouteById(getMapById(selectedMapIdRef.current), enemy.routeId);

  const markCurrentMapCompleted = () => {
    const mapId = selectedMapIdRef.current;
    const difficultyKey = difficultyRef.current;
    setProgression((prev) => {
      const current = prev.mapCompletions[mapId] ?? [];
      if (current.includes(difficultyKey)) return prev;
      const next = normalizeProgression({
        ...prev,
        mapCompletions: {
          ...prev.mapCompletions,
          [mapId]: [...current, difficultyKey],
        },
      });
      progressionRef.current = next;
      pushLog(`Карту ${getMapById(mapId).name} пройдено на складності ${DIFFICULTY_CONFIG[difficultyKey].label}.`);
      return next;
    });
  };

  const isTowerUnlocked = (towerType: string, progress = progressionRef.current) => {
    return progress.unlockedTowers.includes(towerType);
  };

  const isTierUnlocked = (towerType: string, pathIndex: number, tier: number, progress = progressionRef.current) => {
    if (tier <= 2) return true;
    return progress.towerMastery[towerType]?.unlockedTiers.includes(getTierUnlockKey(pathIndex, tier)) ?? false;
  };

  const applyAchievementRewards = (achievementIds: string[], progress: ProgressionState) => {
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
  };

  const awardAchievements = (achievementIds: string[]) => {
    if (achievementIds.length === 0) return;
    setProgression((prev) => {
      const freshIds = achievementIds.filter((id) => !prev.achievements.includes(id));
      if (freshIds.length === 0) return prev;
      const next = normalizeProgression(applyAchievementRewards(freshIds, {
        ...prev,
        achievements: [...prev.achievements, ...freshIds],
      }));
      progressionRef.current = next;
      freshIds.forEach((id) => {
        const achievement = ACHIEVEMENTS.find((a) => a.id === id);
        sessionAchievementsRef.current = Array.from(new Set([...sessionAchievementsRef.current, id]));
        enqueueAchievementToast(id);
        pushLog(`🏆 Досягнення: ${achievement?.name ?? id}!`);
      });
      return next;
    });
  };

  const addPlayerXp = (rawXp: number) => {
    if (rawXp <= 0) return;
    const difficultyMult = difficultyRef.current === "hard" ? 1.5 : 1;
    const endlessMult = getEndlessXpMultiplier(waveRef.current);
    const gained = Math.max(1, Math.floor(rawXp * difficultyMult * endlessMult));
    sessionPlayerXpRef.current += gained;
    setProgression((prev) => {
      const beforeLevel = prev.playerLevel;
      const next = normalizeProgression({ ...prev, totalXp: prev.totalXp + gained });
      progressionRef.current = next;
      if (next.playerLevel > beforeLevel) {
        pushLog(`⬆️ Рівень гравця ${next.playerLevel}! Нові вежі/нагороди відкрито.`);
      }
      const earned: string[] = [];
      if (next.playerLevel >= 10) earned.push("level_10");
      if (next.playerLevel >= 25) earned.push("level_25");
      if (next.playerLevel >= 50) earned.push("level_50");
      if (next.unlockedTowers.length >= Object.keys(TOWER_CONFIGS).length) earned.push("all_towers");
      setTimeout(() => awardAchievements(earned), 0);
      return next;
    });
  };

  const addTowerXp = (towerType: string, amount: number) => {
    if (amount <= 0 || !TOWER_CONFIGS[towerType]) return;
    sessionTowerXpRef.current[towerType] = (sessionTowerXpRef.current[towerType] ?? 0) + amount;
    setProgression((prev) => {
      const mastery = prev.towerMastery[towerType] ?? { towerXp: 0, unlockedTiers: [], highestTierAchieved: 2 };
      const next = normalizeProgression({
        ...prev,
        towerMastery: {
          ...prev.towerMastery,
          [towerType]: {
            ...mastery,
            towerXp: mastery.towerXp + amount,
          },
        },
      });
      progressionRef.current = next;
      return next;
    });
  };

  const addTowerXpById = (towerId: string | undefined, amount: number) => {
    if (!towerId || amount <= 0) return;
    const tower = towersRef.current.find((t) => t.id === towerId);
    if (tower) addTowerXp(tower.type, amount);
  };

  const unlockTierForTower = (towerType: string, pathIndex: number, tier: number) => {
    const cost = TIER_UNLOCK_COSTS[tier];
    if (!cost) return;
    if (tier === 5 && progressionRef.current.playerLevel < 25) {
      pushLog("Tier 5 відкривається тільки з рівня гравця 25.");
      return;
    }
    const key = getTierUnlockKey(pathIndex, tier);
    setProgression((prev) => {
      const mastery = prev.towerMastery[towerType] ?? { towerXp: 0, unlockedTiers: [], highestTierAchieved: 2 };
      if (mastery.unlockedTiers.includes(key)) return prev;
      if (mastery.towerXp < cost) {
        pushLog(`Недостатньо XP ${TOWER_CONFIGS[towerType].name}: треба ${cost}, є ${Math.floor(mastery.towerXp)}.`);
        return prev;
      }
      const next = normalizeProgression({
        ...prev,
        towerMastery: {
          ...prev.towerMastery,
          [towerType]: {
            ...mastery,
            towerXp: mastery.towerXp - cost,
            unlockedTiers: [...mastery.unlockedTiers, key],
          },
        },
      });
      progressionRef.current = next;
      pushLog(`Відкрито ${TOWER_CONFIGS[towerType].name} P${pathIndex + 1}T${tier} за ${cost} XP.`);
      return next;
    });
  };

  const hasT5ForTowerPath = (towerType: string, pathIndex: number, exceptTowerId?: string) => {
    return towersRef.current.some((tower) => {
      if (tower.type !== towerType || tower.id === exceptTowerId) return false;
      return pathIndex === 0 ? tower.path1Tier >= 5 : pathIndex === 1 ? tower.path2Tier >= 5 : tower.path3Tier >= 5;
    });
  };

  useEffect(() => {
    if (gold >= 5000) awardAchievements(["rich"]);
  }, [gold]);

  const applyDifficultyToEnemy = <T extends { hp: number; maxHp?: number; speed: number; reward: number; damage: number }>(enemy: T): T => {
    const config = DIFFICULTY_CONFIG[difficultyRef.current];
    enemy.hp = Math.max(1, Math.floor(enemy.hp * config.hpMult));
    if (enemy.maxHp !== undefined) enemy.maxHp = enemy.hp;
    enemy.speed *= config.speedMult;
    enemy.reward = Math.max(1, Math.floor(enemy.reward * config.rewardMult));
    enemy.damage = Math.max(1, Math.floor(enemy.damage * (difficultyRef.current === "hard" ? 1.15 : difficultyRef.current === "easy" ? 0.85 : 1)));
    return enemy;
  };

  // --- UTILS ---
  const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.hypot(x2 - x1, y2 - y1);
  };

  const getDistanceToSegment = (p: PathPoint, a: PathPoint, b: PathPoint): number => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) return getDistance(p.x, p.y, a.x, a.y);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    return getDistance(p.x, p.y, a.x + t * dx, a.y + t * dy);
  };

  const isPositionOnPath = (x: number, y: number, radius = 24) => {
    const activeMap = getActiveMap();
    for (const route of activeMap.routes) {
      for (let i = 0; i < route.points.length - 1; i++) {
        const dist = getDistanceToSegment({ x, y }, route.points[i], route.points[i + 1]);
        if (dist < radius) return true;
      }
    }
    return false;
  };

  const getEffectiveTowerRange = (tower: PlacedTower) => {
    return tower.range + (tower.coffeeRangeBonus || 0) + tower.range * (tower.coffeeRangeBuffPercent || 0);
  };

  const getEffectiveTowerDamage = (tower: PlacedTower) => {
    // Coffee/Bankomat damage buffs are now percentage-based (e.g. 30 = +30% damage)
    return tower.damage * (1 + (tower.coffeeDamageBonus || 0) / 100);
  };

  const applyDamageDebuffCap = (current: number | undefined, incoming: number) => {
    return Math.min(1.6, Math.max(current || 1.0, incoming));
  };

  const getExpectedDps = (tower: Pick<PlacedTower, "type" | "damage" | "fireRate" | "critChance" | "critMultiplier" | "gachaChance" | "gachaDamageOverride" | "alwaysDouble" | "twoHits">) => {
    if (!tower.fireRate) return 0;
    let dmg = tower.damage;
    if (tower.critChance) dmg *= (1 - tower.critChance) + tower.critChance * (tower.critMultiplier || 3);
    if (tower.gachaChance) dmg = dmg * (1 - tower.gachaChance) + (tower.gachaDamageOverride || 300) * tower.gachaChance;
    const shotMult = tower.alwaysDouble ? 2 : tower.twoHits ? 4 / 3 : 1;
    return (dmg * shotMult) / tower.fireRate;
  };

  const formatStat = (value: number) => {
    if (Number.isInteger(value)) return `${value}`;
    return value.toFixed(1).replace(/\.0$/, "");
  };

  const getUpgradePreview = (tower: PlacedTower, upgrade: Upgrade) => {
    const next = upgrade.effect(buildUpgradeStats(tower));
    if (isSupportTowerType(tower.type)) {
      const currentSpeedBuff = tower.buffMultiplier || (tower.type === "coffee" ? 0.05 : 0);
      const nextSpeedBuff = next.buffMultiplier || (tower.type === "coffee" ? 0.05 : 0);
      return [
        `AURA ${Math.round(tower.range)}→${Math.round(next.range)}px`,
        `GOLD +${tower.endOfWaveBonus || 0}→+${next.endOfWaveBonus || 0}`,
        `DMG +${formatStat(tower.damageBuff || 0)}%→+${formatStat(next.damageBuff || 0)}%`,
        `RNG +${formatStat(tower.rangeBuff || 0)}px/${Math.round((tower.rangeBuffPercent || 0) * 100)}%→+${formatStat(next.rangeBuff || 0)}px/${Math.round((next.rangeBuffPercent || 0) * 100)}%`,
        `SPD +${Math.round(currentSpeedBuff * 100)}%→+${Math.round(nextSpeedBuff * 100)}%`,
        `ARM ${Math.round((tower.ignoreArmorBuff || 0) * 100)}%→${Math.round((next.ignoreArmorBuff || 0) * 100)}%`,
        `CAMO ${tower.camoDetectionBuff ? "так" : "ні"}→${next.camoDetectionBuff ? "так" : "ні"}`
      ].join(" | ");
    }

    const beforeDps = getExpectedDps({ ...tower, damage: getEffectiveTowerDamage(tower) });
    const afterDps = getExpectedDps({ ...tower, ...next, damage: next.damage * (1 + (tower.coffeeDamageBonus || 0) / 100) });
    return `DPS ${beforeDps.toFixed(1)}→${afterDps.toFixed(1)} | DMG ${tower.damage}→${next.damage} | RNG ${tower.range}→${next.range} | RATE ${tower.fireRate.toFixed(2)}→${next.fireRate.toFixed(2)} | P ${tower.pierce || 1}→${next.pierce || 1}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatus !== "playing") return;

      const key = e.key.toLowerCase();
      if (["q", "w", "e"].includes(key) && selectedPlacedTowerId) {
        e.preventDefault();
        buyUpgrade({ q: 0, w: 1, e: 2 }[key] ?? 0);
        return;
      }

      if (e.key === " " && !isWaveActive) {
        e.preventDefault();
        startNextWave();
        return;
      }

      if ((e.key === "Delete" || e.key === "x" || e.key === "X") && selectedPlacedTowerId) {
        e.preventDefault();
        sellSelectedTower();
        return;
      }

      const towerKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
      const towerTypes = Object.keys(TOWER_CONFIGS);
      
      if (towerKeys.includes(e.key)) {
        const idx = e.key === "0" ? 9 : parseInt(e.key) - 1;
        if (idx < towerTypes.length) {
          const type = towerTypes[idx];
          if (!isTowerUnlocked(type)) {
            pushLog(`${TOWER_CONFIGS[type].name} ще заблоковано.`);
            return;
          }
          setSelectedShopTower(selectedShopTower === type ? null : type);
          setSelectedPlacedTowerId(null);
          setSelectedTower(null);
        }
      } else if (e.key === "Escape") {
        setSelectedShopTower(null);
        setSelectedPlacedTowerId(null);
        setSelectedTower(null);
      } else if (e.key === "p" || e.key === "P") {
        setIsPaused(prev => !prev);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStatus, selectedShopTower, selectedPlacedTowerId, isWaveActive]);

  // Spawn float text
  const spawnFloatingText = (x: number, y: number, text: string, color = "#ffffff", size = 12, font = "Arial") => {
    floatingTextsRef.current.push({
      x,
      y,
      text,
      color,
      life: 45,
      maxLife: 45,
      size,
      font
    });
  };

  // Spawn particles
  const spawnHitParticles = (x: number, y: number, color: string, count = 8, shape: "circle" | "square" = "circle") => {
    if (!settingsRef.current.particles) return;
    for (let i = 0; i < count; i++) {
      const angle = getPureRandom() * Math.PI * 2;
      const speed = getPureRandom() * 2 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: getPureRandom() * 3 + 2,
        life: 30,
        maxLife: 30,
        shape
      });
    }
  };

  // Spawns enemy from death actions (e.g. boss minions)
  const spawnEnemyCallback = (type: string, x: number, y: number, modifiers?: EnemyModifier[], routeId?: string) => {
    const baseConfig = getEnemyStatsForWave(type, waveRef.current, modifiers);
    const activeMap = getActiveMap();
    const route = getRouteById(activeMap, routeId ?? getWaveRouteIds(activeMap, waveRef.current)[0]);
    // Find closest pathIndex for spawned minion
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
      isPhantomCamo: baseConfig.isPhantomCamo,
      isExploder: baseConfig.isExploder,
      isHealer: baseConfig.isHealer,
      isFlying: baseConfig.isFlying,
      knockbackMultiplier: baseConfig.knockbackMultiplier,
      shieldHp: baseConfig.shieldHp,
      tier: baseConfig.tier,
      damageReduce: baseConfig.tier ? TIER_SCALING[baseConfig.tier - 1]?.damageReduce ?? 0 : 0,
      stunImmune: baseConfig.stunImmune,
      knockbackImmune: baseConfig.knockbackImmune
    };
    enemiesRef.current.push(applyDifficultyToEnemy(newEnemy));
  };

  // --- GAME INITIALIZATION & CONTROL ---
  const startGame = () => {
    const selectedDifficulty = DIFFICULTY_CONFIG[difficultyRef.current];
    const activeMap = getActiveMap();
    const progress = progressionRef.current;
    towersRef.current = [];
    enemiesRef.current = [];
    projectilesRef.current = [];
    mineProjectilesRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    speedTrailsRef.current = [];
    minesRef.current = [];
    const startingLives = selectedDifficulty.lives + progress.bonusLives;
    const startingGold = selectedDifficulty.gold + progress.bonusStartGold;
    setLives(startingLives);
    livesRef.current = startingLives;
    setGold(startingGold);
    goldRef.current = startingGold;
    setWave(1);
    waveRef.current = 1;
    setIsWaveActive(false);
    isWaveActiveRef.current = false;
    setGameStatus("playing");
    gameStatusRef.current = "playing";
    setIsPaused(false);
    setIsEndless(false);
    setScore(0);
    waveKillsRef.current = 0;
    gameStartFrameRef.current = frameCountRef.current;
    sessionPlayerXpRef.current = 0;
    sessionTowerXpRef.current = {};
    sessionAchievementsRef.current = [];
    sessionStartLevelRef.current = progress.playerLevel;
    sessionStartUnlockedTowersRef.current = [...progress.unlockedTowers];
    sessionSummaryDoneRef.current = false;
    setSessionSummary(null);
    setAchievementToasts([]);
    setSelectedShopTower(null);
    setSelectedPlacedTowerId(null);
    setSelectedTower(null);
    pushLog(`Карта: ${activeMap.name}. Складність: ${selectedDifficulty.label}. Поставте першого юніта!`);
  };

  const startNextWave = () => {
    if (isWaveActiveRef.current || gameStatusRef.current !== "playing") return;

    const segments = getScaledWave(waveRef.current);
    const activeMap = getActiveMap();
    const activeRouteIds = getWaveRouteIds(activeMap, waveRef.current);
    
    // Build spawn queue
    const queue: { type: string; delay: number; modifiers?: EnemyModifier[]; routeId?: string }[] = [];
    segments.forEach((seg) => {
      for (let i = 0; i < seg.count; i++) {
        queue.push({
          type: seg.type,
          delay: seg.spawnDelay,
          modifiers: seg.modifiers,
          routeId: activeRouteIds[i % activeRouteIds.length]
        });
      }
      if (seg.delayBeforeNext) {
        // insert empty delay
        queue.push({ type: "", delay: seg.delayBeforeNext });
      }
    });

    spawnQueueRef.current = queue;
    waveStartLivesRef.current = livesRef.current;
    waveKillsRef.current = 0;
    spawnTimerRef.current = 0;
    const totalEnemies = segments.reduce((sum, s) => sum + s.count, 0);
    waveTotalEnemiesRef.current = totalEnemies;
    waveTotalHpRef.current = segments.reduce((sum, s) => sum + getEnemyStatsForWave(s.type, waveRef.current, s.modifiers).hp * s.count, 0);
    setIsWaveActive(true);
    isWaveActiveRef.current = true;
    waveAnnouncementRef.current = { wave: waveRef.current, frameStart: frameCountRef.current };
    playTowerSound("wave");

    const routeNotice = activeRouteIds.length > 1
      ? ` Маршрути: ${activeRouteIds.map((id) => getRouteById(activeMap, id).name).join(" / ")}.`
      : "";
    pushLog(`${getWaveQuote(waveRef.current)}${routeNotice}`);

    if (waveRef.current === 16) {
      pushLog("🔩 Хвиля 16: Свинцеві вороги (🔩)! Звичайні молотки не пробивають їх. Використовуйте Газ, Infinix, Цукерки, або Молот T1P4 ('Руйнівник граніту').");
    } else if (waveRef.current === 24) {
      pushLog("💗 Хвиля 24: Регенеративні вороги (💗)! Вони швидко відновлюють здоров'я. Потрібна висока швидкість атаки (напр. Молот T2) або уповільнення (Цукерки).");
    } else if (waveRef.current === 20) {
      pushLog("⚠️ Хвиля 20: Інфінікс-Брати (👾) та Камуфляжні (🦹)! Вони лагають реальність і невидимі для звичайних веж. Використовуйте Infinix або апгрейди з виявленням камуфляжу.");
    } else if (waveRef.current === 28) {
      pushLog("🍬 Хвиля 28: Рачкові та Газові Брати (🍬💨)! Вони прискорюють союзників та уповільнюють ваші башні.");
    } else if (waveRef.current === 32) {
      pushLog("🗿 Хвиля 32: Гранітні, Фантоми та Вибухові Брати! Граніт має 75% броню, Фантоми невидимі навіть для сканерів.");
    } else if (waveRef.current === 36) {
      pushLog("🦘🛡️ Хвиля 36: Стрибуни та Щитові Брати! Стрибуни телепортуються на 100px, Щитові мають регенеруючий щит.");
    } else if (waveRef.current === 41) {
      pushLog("💀 КОМБО #1 (Camo+Lead): Невидимі + імунні до молотків! Потрібні башні з камуфляж-детекцією, що б'ють не молотком.");
    } else if (waveRef.current === 42) {
      pushLog("💀 КОМБО #2 (Regen+Phantom): Регенерація + супер-камуфляж! Вороги зцілюються і невидимі навіть для сканерів.");
    } else if (waveRef.current === 43) {
      pushLog("💀 КОМБО #3 (Shielded+Exploder): Щит + вибух при смерті! Вибух оглушує башні, щит захищає від першого удару.");
    } else if (waveRef.current === 44) {
      pushLog("💀 КОМБО #4 (Granite+Lead): Подвійна броня! Граніт -75% фіз. шкоди, Свинець - повний імунітет до молотків.");
    } else if (waveRef.current === 45) {
      pushLog("💀 КОМБО #5 (Jumper+Regen): Телепорт + регенерація! Вороги стрибають вперед і зцілюються.");
    } else if (waveRef.current === 46) {
      pushLog("👹 ФІНАЛЬНИЙ КОМБО-БОС: ВСІ СИНЕРГІЇ! Удачі...");
    }
  };

  // --- CLICK HANDLING (PLACEMENT & SELECTION) ---
  const tryPlaceTower = (type: string, x: number, y: number): boolean => {
    const config = TOWER_CONFIGS[type];
    if (!config) return false;

    if (!isTowerUnlocked(type)) {
      const neededLevel = TOWER_UNLOCK_LEVELS[type] ?? 1;
      pushLog(`${config.name} відкривається на рівні ${neededLevel}.`);
      return false;
    }

    // Validate gold
    if (gold < config.cost) {
      pushLog("Недостатньо Nescafe Gold!");
      return false;
    }

    // Validate bounds
    if (x < 24 || x > GAME_WIDTH - 24 || y < 24 || y > GAME_HEIGHT - 24) {
      pushLog("Тут не можна ставити башти!");
      return false;
    }

    // Validate collision with path
    if (isPositionOnPath(x, y, 26)) {
      pushLog("Не можна ставити башти на дорозі!");
      return false;
    }

    // Validate collision with obstacles
    const onObstacle = getActiveMap().obstacles.some((obs) => getDistance(x, y, obs.x, obs.y) < obs.radius + 18);
    if (onObstacle) {
      pushLog("Не можна будувати вежу на перешкоді!");
      return false;
    }

    // Validate collision with existing towers
    const isOverlap = towersRef.current.some((t) => getDistance(x, y, t.x, t.y) < 26);
    if (isOverlap) {
      pushLog("Занадто близько до іншої башти!");
      return false;
    }

    // Create new tower
    const newTower: PlacedTower = {
      id: getPureId(),
      x,
      y,
      type,
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
      pierce: config.pierce || 1,
      tackCount: config.tackCount,
      maxMines: config.maxMines,
      targetingMode: "first",
    };

    // Apply initial setup for buffs/aura
    if (type === "coffee") {
      newTower.buffMultiplier = 0.05;
      newTower.endOfWaveBonus = 20;
    } else if (type === "bankomat") {
      newTower.endOfWaveBonus = 25;
      newTower.rangeBuffPercent = 0.10;
    } else if (type === "gas") {
      newTower.slowAmount = 0.15;
    } else if (type === "chain") {
      // Chain tower has innate chain (pierce=4 already set from config)
    }

    towersRef.current.push(newTower);
    if (towersRef.current.length >= 10) awardAchievements(["tower_farm"]);
    setGold((prev) => prev - config.cost);
    pushLog(`Створено юніт: ${config.name}!`);
    
    // Play sound!
    playTowerSound(type);
    
    // Spawn feedback
    spawnFloatingText(x, y - 20, `-${config.cost} ☕`, "#ef4444");
    return true;
  };

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const updateCanvasPointer = (clientX: number, clientY: number) => {
    const point = getCanvasPoint(clientX, clientY);
    if (!point) return null;

    mousePosRef.current = point;
    setMousePos(point);

    if (draggedTowerTypeRef.current) {
      draggedTowerPosRef.current = point;
      setDraggedTowerPos(point);
    }

    return point;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameStatus !== "playing") return;

    const point = updateCanvasPointer(e.clientX, e.clientY);
    if (!point) return;

    const clickX = point.x;
    const clickY = point.y;

    // 1. Placing a new tower
    if (selectedShopTower) {
      const success = tryPlaceTower(selectedShopTower, clickX, clickY);
      if (success) {
        setSelectedShopTower(null);
      }
      return;
    }

    // 2. Selecting an existing tower
    const clickedTower = towersRef.current.find((t) => getDistance(clickX, clickY, t.x, t.y) < 20);
    if (clickedTower) {
      setSelectedPlacedTowerId(clickedTower.id);
      setSelectedTower(clickedTower);
      if (typeof window !== "undefined" && window.innerWidth < 768) setIsPaused(true);
      pushLog(`Вибрано: ${clickedTower.name}. Убивств: ${clickedTower.totalKills}`);
    } else {
      setSelectedPlacedTowerId(null);
      setSelectedTower(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    updateCanvasPointer(e.clientX, e.clientY);
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    updateCanvasPointer(touch.clientX, touch.clientY);
  };

  const handleCanvasTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.changedTouches[0];
    if (!touch || gameStatus !== "playing" || !selectedShopTower) return;
    const point = updateCanvasPointer(touch.clientX, touch.clientY);
    if (!point) return;
    if (tryPlaceTower(selectedShopTower, point.x, point.y)) setSelectedShopTower(null);
  };

  // --- SELLING & UPGRADING TOWERS ---
  const sellSelectedTower = () => {
    if (!selectedPlacedTowerId) return;
    const towerIdx = towersRef.current.findIndex((t) => t.id === selectedPlacedTowerId);
    if (towerIdx === -1) return;

    const tower = towersRef.current[towerIdx];
    const baseConfig = TOWER_CONFIGS[tower.type];
    
    // Calculate total cost spent on tower based on path tiers
    let totalCost = baseConfig.cost;
    for (let i = 0; i < tower.path1Tier; i++) totalCost += baseConfig.upgrades.path1[i].cost;
    for (let i = 0; i < tower.path2Tier; i++) totalCost += baseConfig.upgrades.path2[i].cost;
    for (let i = 0; i < tower.path3Tier; i++) totalCost += baseConfig.upgrades.path3[i].cost;

    const hasTier5 = tower.path1Tier >= 5 || tower.path2Tier >= 5 || tower.path3Tier >= 5;
    const sellPrice = Math.floor(totalCost * (hasTier5 ? 0.5 : 0.8));
    setGold((prev) => prev + sellPrice);
    
    // Remove tower
    towersRef.current.splice(towerIdx, 1);
    
    // Remove mines and in-flight mine projectiles from this tower
    minesRef.current = minesRef.current.filter(m => m.towerId !== tower.id);
    mineProjectilesRef.current = mineProjectilesRef.current.filter(p => p.towerId !== tower.id);
    
    setSelectedPlacedTowerId(null);
    setSelectedTower(null);
    pushLog(`Продано ${tower.name} за ${sellPrice} Nescafe Gold.`);
    spawnFloatingText(tower.x, tower.y - 20, `+${sellPrice} ☕`, "#22c55e");
  };

  const buyUpgrade = (pathIndex: number) => {
    if (!selectedPlacedTowerId) return;
    const tower = towersRef.current.find((t) => t.id === selectedPlacedTowerId);
    if (!tower) return;

    // Check if upgrade is allowed under BTD6 rules
    if (!checkUpgradeAllowed(tower.path1Tier, tower.path2Tier, tower.path3Tier, pathIndex)) {
      pushLog("Цей шлях заблоковано правилами крос-пасингу BTD6!");
      return;
    }

    const baseConfig = TOWER_CONFIGS[tower.type];
    
    // Find next upgrade in path
    let upgrade = null;
    if (pathIndex === 0 && tower.path1Tier < 5) {
      upgrade = baseConfig.upgrades.path1[tower.path1Tier];
    } else if (pathIndex === 1 && tower.path2Tier < 5) {
      upgrade = baseConfig.upgrades.path2[tower.path2Tier];
    } else if (pathIndex === 2 && tower.path3Tier < 5) {
      upgrade = baseConfig.upgrades.path3[tower.path3Tier];
    }

    if (!upgrade) {
      pushLog("Шлях уже повністю прокачано!");
      return;
    }

    const nextTier = pathIndex === 0 ? tower.path1Tier + 1 : pathIndex === 1 ? tower.path2Tier + 1 : tower.path3Tier + 1;
    if (nextTier >= 3 && !isTierUnlocked(tower.type, pathIndex, nextTier)) {
      pushLog(`Спочатку відкрийте ${tower.name} P${pathIndex + 1}T${nextTier} за Tower XP.`);
      return;
    }

    if (nextTier === 5 && hasT5ForTowerPath(tower.type, pathIndex, tower.id)) {
      pushLog(`Вже є Tier 5 для ${tower.name} на шляху ${pathIndex + 1}. Продайте його, щоб поставити інший.`);
      return;
    }

    if (gold < upgrade.cost) {
      pushLog("Недостатньо Nescafe Gold для апгрейду!");
      return;
    }

    // Apply upgrade
    const newStats = upgrade.effect({
      range: tower.range,
      damage: tower.damage,
      fireRate: tower.fireRate,
      twoHits: tower.twoHits,
      critChance: tower.critChance,
      buffMultiplier: tower.buffMultiplier,
      endOfWaveBonus: tower.endOfWaveBonus,
      isAoESlow: tower.isAoESlow,
      damageDebuff: tower.damageDebuff,
      freezeChance: tower.freezeChance,
      gachaChance: tower.gachaChance,
      copilotBug: tower.copilotBug,
      slowAmount: tower.slowAmount,
      antiArmor: tower.antiArmor,
      ignoresArmor: tower.ignoresArmor,
      alwaysDouble: tower.alwaysDouble,
      critMultiplier: tower.critMultiplier,
      damageBuff: tower.damageBuff,
      rangeBuff: tower.rangeBuff,
      ignoreArmorBuff: tower.ignoreArmorBuff,
      rangeBuffPercent: tower.rangeBuffPercent,
      slowDurationBonus: tower.slowDurationBonus,
      slowFactorBonus: tower.slowFactorBonus,
      explodeDmg: tower.explodeDmg,
      gachaDamageOverride: tower.gachaDamageOverride,
      freezeDurationBonus: tower.freezeDurationBonus,
      bsodAoE: tower.bsodAoE,
      bugExplodeDmg: tower.bugExplodeDmg,
      bugExplodeRadius: tower.bugExplodeRadius,
      bugContagion: tower.bugContagion,
      disableGlitch: tower.disableGlitch,
      disableAbilities: tower.disableAbilities,
      camoDetection: tower.camoDetection,
      camoDetectionBuff: tower.camoDetectionBuff,
      pierce: tower.pierce,
      knockbackChance: tower.knockbackChance,
      knockbackDistance: tower.knockbackDistance,
      microStunDuration: tower.microStunDuration,
      wallBounce: tower.wallBounce,
      tripleShot: tower.tripleShot,
      quadShot: tower.quadShot,
      everyNthTriple: tower.everyNthTriple,
      spreadChance: tower.spreadChance,
      spreadDamageBonus: tower.spreadDamageBonus,
      gachaDamageMultiplier: tower.gachaDamageMultiplier,
      conditionalTripleWithPierce: tower.conditionalTripleWithPierce
    });

    // Deduct cost and apply variables
    setGold((prev) => prev - upgrade.cost);
    tower.upgradesBought.push(upgrade.id);
    
    if (pathIndex === 0) tower.path1Tier++;
    else if (pathIndex === 1) tower.path2Tier++;
    else if (pathIndex === 2) tower.path3Tier++;

    if (nextTier === 5) awardAchievements(["first_t5"]);

    setProgression((prev) => {
      const mastery = prev.towerMastery[tower.type] ?? { towerXp: 0, unlockedTiers: [], highestTierAchieved: 2 };
      const next = normalizeProgression({
        ...prev,
        towerMastery: {
          ...prev.towerMastery,
          [tower.type]: {
            ...mastery,
            highestTierAchieved: Math.max(mastery.highestTierAchieved, nextTier),
          },
        },
      });
      progressionRef.current = next;
      return next;
    });

    applyUpgradeStats(tower, newStats);
    tower.level += 1;

    // Special logic for refund upgrade
    if (upgrade.id === "candy_cheap") {
      setGold((prev) => prev + 40);
      spawnFloatingText(tower.x, tower.y - 35, `+40 ☕`, "#22c55e");
    }

    pushLog(`Апгрейд куплено: ${upgrade.name}!`);
    spawnFloatingText(tower.x, tower.y - 20, `-${upgrade.cost} ☕`, "#ef4444");
    spawnHitParticles(tower.x, tower.y, "#facc15", 16, "square");
    explosionRingsRef.current.push({
      x: tower.x, y: tower.y,
      radius: 10, maxRadius: tower.range,
      color: "#facc15",
      life: 30
    });
    playPdrSound();
    setSelectedTower({ ...tower });
  };

  // System: pre-calculate support tower buffs for all towers.
  function updateCoffeeBuffs(towers: PlacedTower[]) {
    const supportTowers = towers.filter((t) => isSupportTowerType(t.type));
    towers.forEach((tower) => {
      let maxBuff = 0;
      let hasCamoBuff = false;
      let maxDamageBuff = 0;
      let maxRangeBuff = 0;
      let maxRangeBuffPercent = 0;
      let maxIgnoreArmorBuff = 0;
      supportTowers.forEach((supportTower) => {
        const dist = getDistance(tower.x, tower.y, supportTower.x, supportTower.y);
        if (dist <= supportTower.range) {
          if (isWaveActiveRef.current && frameCountRef.current % 60 === 0 && tower.id !== supportTower.id) {
            addTowerXp(supportTower.type, 0.1);
          }
          const buffVal = supportTower.buffMultiplier || (supportTower.type === "coffee" ? 0.05 : 0);
          if (buffVal > maxBuff) maxBuff = buffVal;
          if (supportTower.camoDetectionBuff) hasCamoBuff = true;
          if (supportTower.damageBuff && supportTower.damageBuff > maxDamageBuff) maxDamageBuff = supportTower.damageBuff;
          if (supportTower.rangeBuff && supportTower.rangeBuff > maxRangeBuff) maxRangeBuff = supportTower.rangeBuff;
          if (supportTower.rangeBuffPercent && supportTower.rangeBuffPercent > maxRangeBuffPercent) maxRangeBuffPercent = supportTower.rangeBuffPercent;
          if (supportTower.ignoreArmorBuff && supportTower.ignoreArmorBuff > maxIgnoreArmorBuff) maxIgnoreArmorBuff = supportTower.ignoreArmorBuff;
        }
      });
      tower.hasCamoBuff = hasCamoBuff;
      tower.hasCoffeeBuff = maxBuff > 0 || hasCamoBuff || maxDamageBuff > 0 || maxRangeBuff > 0 || maxRangeBuffPercent > 0 || maxIgnoreArmorBuff > 0;
      tower.coffeeBuffMultiplier = maxBuff;
      tower.coffeeBuffStrength = Math.min(1, Math.max(
        maxBuff / 0.6,
        maxDamageBuff / 60,
        maxRangeBuff / 80,
        maxRangeBuffPercent,
        maxIgnoreArmorBuff,
        hasCamoBuff ? 0.25 : 0
      ));
      tower.coffeeDamageBonus = maxDamageBuff;
      tower.coffeeRangeBonus = maxRangeBuff;
      tower.coffeeRangeBuffPercent = maxRangeBuffPercent;
      tower.coffeeIgnoreArmorBuff = maxIgnoreArmorBuff;
    });
  }

  // --- MAIN LOOP ---
  useEffect(() => {
    let animationId: number;

    const updateGame = () => {
      frameCountRef.current++;
      // If not playing or paused, skip physics updates
      if (gameStatusRef.current !== "playing" || isPausedRef.current) return;

      const speedMult = gameSpeedRef.current; // 1 or 2

      for (let s = 0; s < speedMult; s++) {
        // --- 1. SPAWNING ENEMIES ---
        if (isWaveActiveRef.current) {
          if (spawnQueueRef.current.length > 0) {
            spawnTimerRef.current += 16.67; // approx ms per frame
            const nextSpawn = spawnQueueRef.current[0];
            if (spawnTimerRef.current >= nextSpawn.delay) {
              spawnTimerRef.current = 0;
              spawnQueueRef.current.shift(); // remove from queue
              
              if (nextSpawn.type) {
                // Actually spawn the enemy
                const baseConfig = getEnemyStatsForWave(nextSpawn.type, waveRef.current, nextSpawn.modifiers);
                const activeMap = getActiveMap();
                const route = getRouteById(activeMap, nextSpawn.routeId ?? getWaveRouteIds(activeMap, waveRef.current)[0]);
                const newEnemy: ActiveEnemy = {
                  id: getPureId(),
                  type: nextSpawn.type,
                  x: route.points[0].x,
                  y: route.points[0].y,
                  hp: baseConfig.hp,
                  maxHp: baseConfig.hp,
                  speed: baseConfig.speed,
                  reward: baseConfig.reward,
                  damage: baseConfig.damage,
                  color: baseConfig.color,
                  borderColor: baseConfig.borderColor,
                  radius: baseConfig.radius,
                  name: baseConfig.name,
                  emoji: EMOJI_MAP[nextSpawn.type] || "😐",
                  routeId: route.id,
                  pathIndex: 1,
                  distanceTraveled: 0,
                  slowDuration: 0,
                  freezeDuration: 0,
                  gasSlowDuration: 0,
                  abilitiesDisabledDuration: 0,
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
                  isPhantomCamo: baseConfig.isPhantomCamo,
                  isExploder: baseConfig.isExploder,
                  isHealer: baseConfig.isHealer,
                  shieldHp: baseConfig.shieldHp,
                  tier: baseConfig.tier,
                  damageReduce: baseConfig.tier ? TIER_SCALING[baseConfig.tier - 1]?.damageReduce ?? 0 : 0,
                  stunImmune: baseConfig.stunImmune,
                  knockbackImmune: baseConfig.knockbackImmune
                };

                enemiesRef.current.push(applyDifficultyToEnemy(newEnemy));
              }
            }
          } else if (enemiesRef.current.length === 0) {
            // Wave clear!
            const clearedWave = waveRef.current;
            isWaveActiveRef.current = false;
            setIsWaveActive(false);
            
            // Apply Nescafe Ritual end of wave bonuses
            let bonusGold = 0;
            towersRef.current.forEach((t) => {
              if (t.endOfWaveBonus) {
                bonusGold += t.endOfWaveBonus;
              }
            });
            const clearBonus = isEndless ? 0 : getNonEndlessWaveClearReward(clearedWave);
            const finalBonus = bonusGold + clearBonus;
            if (finalBonus > 0) {
              setGold((prev) => prev + finalBonus);
            }
            setScore((prev) => prev + clearedWave * 50);
            const perfectWave = livesRef.current >= waveStartLivesRef.current;
            addPlayerXp((clearedWave * 15 + waveKillsRef.current * 3 + (clearedWave === 46 ? 1000 : 0)) * (perfectWave ? 1.5 : 1));

            const earnedAchievements: string[] = [];
            if (clearedWave >= 1) earnedAchievements.push("first_wave");
            if (clearedWave >= 10) earnedAchievements.push("wave_10");
            if (clearedWave >= 20) earnedAchievements.push("wave_20");
            if (clearedWave >= 30) earnedAchievements.push("wave_30");
            if (clearedWave >= 40) earnedAchievements.push("wave_40");
            if (clearedWave >= 46) earnedAchievements.push("wave_46");
            if (clearedWave >= 46 && difficultyRef.current === "hard") earnedAchievements.push("hard_mode");
            if (clearedWave >= 70 && isEndless) earnedAchievements.push("endless_70");
            awardAchievements(earnedAchievements);

            pushLog(finalBonus > 0
              ? `Накат братви відбито! +${finalBonus} ☕ (${clearBonus ? `хвиля ${clearBonus}` : ""}${clearBonus && bonusGold ? " + " : ""}${bonusGold ? `економіка ${bonusGold}` : ""}).`
              : "Накат братви відбито!");
            
            // Check victory conditions (after wave 46)
            if (clearedWave === 46 && !isEndless) {
              markCurrentMapCompleted();
              gameStatusRef.current = "victory";
              setGameStatus("victory");
              setTimeout(buildSessionSummary, 0);
            } else {
              const nextWave = clearedWave + 1;
              waveRef.current = nextWave;
              setWave(nextWave);
              if (isAutoStartRef.current) {
                setTimeout(() => {
                  startNextWave();
                }, 1000);
              }
            }
          }
        }

        // --- 2. MOVE TRAILS & PARTICLES & FLOATS ---
        // Trails
        speedTrailsRef.current = speedTrailsRef.current
          .map((trail) => ({ ...trail, life: trail.life - 1 }))
          .filter((trail) => trail.life > 0);

        // Particles
        particlesRef.current = particlesRef.current
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 1
          }))
          .filter((p) => p.life > 0);

        // Floating texts
        floatingTextsRef.current = floatingTextsRef.current
          .map((ft) => ({
            ...ft,
            y: ft.y - 0.4,
            life: ft.life - 1
          }))
          .filter((ft) => ft.life > 0);

        // Projectile trails
        projectileTrailRef.current = projectileTrailRef.current
          .map(t => ({ ...t, alpha: t.alpha - 0.03, size: t.size * 0.95 }))
          .filter(t => t.alpha > 0);

        // Explosion rings
        explosionRingsRef.current = explosionRingsRef.current
          .map(r => ({ ...r, radius: r.radius + 3, life: r.life - 1 }))
          .filter(r => r.life > 0);

        // --- 3. PROCESS ENEMIES ---
        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
          const enemy = enemiesRef.current[i];

          // Check if frozen
          if (enemy.freezeDuration > 0) {
            enemy.freezeDuration--;
          }

          // Check slow durations
          if (enemy.slowDuration > 0) {
            enemy.slowDuration--;
          }
          if (enemy.gasSlowDuration > 0) {
            enemy.gasSlowDuration--;
          }
          if ((enemy.abilitiesDisabledDuration || 0) > 0) {
            enemy.abilitiesDisabledDuration = (enemy.abilitiesDisabledDuration || 0) - 1;
          }

          // Shield regeneration for shielded enemies
          if (enemy.shieldHp !== undefined && enemy.shieldHp <= 0) {
            if (enemy.shieldRegenTimer === undefined) enemy.shieldRegenTimer = 360;
            enemy.shieldRegenTimer--;
            if (enemy.shieldRegenTimer <= 0) {
              enemy.shieldHp = 80; // Regenerate shield
              enemy.shieldRegenTimer = undefined;
              spawnFloatingText(enemy.x, enemy.y - 20, "🛡️ ЩИТ!", "#0ea5e9");
            }
          }

          // Check if standing on speed trail (sweet pink candy dust)
          let standingOnTrail = false;
          for (const trail of speedTrailsRef.current) {
            if (getDistance(enemy.x, enemy.y, trail.x, trail.y) < trail.radius) {
              standingOnTrail = true;
              break;
            }
          }

          // Calculate actual speed
          let currentSpeed = enemy.speed;
          if (enemy.freezeDuration > 0) {
            currentSpeed = 0;
          } else {
            let activeSlow = 0;
            if (enemy.slowDuration > 0) {
              activeSlow = Math.max(activeSlow, enemy.candySlowFactor || 0.5);
            }
            if (enemy.gasSlowDuration > 0) {
              activeSlow = Math.max(activeSlow, enemy.gasSlowFactor || 0.15);
            }
            currentSpeed *= (1 - activeSlow);

            if (standingOnTrail) {
              currentSpeed *= 1.4; // 40% speed boost
            }
            currentSpeed = Math.max(currentSpeed, enemy.speed * 0.15); // soft cap: slows cannot go below 15% speed
          }

          // Move enemy along path segments
          if (currentSpeed > 0) {
            const route = getEnemyRoute(enemy);
            const target = route.points[enemy.pathIndex];
            if (!target) {
              enemiesRef.current.splice(i, 1);
              continue;
            }
            const dx = target.x - enemy.x;
            const dy = target.y - enemy.y;
            const dist = getDistance(enemy.x, enemy.y, target.x, target.y);

            if (dist <= currentSpeed) {
              // Snap to checkpoint
              enemy.x = target.x;
              enemy.y = target.y;
              enemy.pathIndex++;

              if (enemy.pathIndex >= route.points.length) {
                // Reached the end: player loses lives
                setLives((prev) => {
                  const newLives = Math.max(0, prev - enemy.damage);
                  if (newLives <= 0) {
                    gameStatusRef.current = "gameover";
                    setGameStatus("gameover");
                    setTimeout(buildSessionSummary, 0);
                    pushLog("Кодло не вивезло. Братва прорвала оборону.");
                  }
                  return newLives;
                });
                
                // Red glowing explosion at the end
                spawnHitParticles(enemy.x - 20, enemy.y, "#ef4444", 12);
                enemiesRef.current.splice(i, 1);
                continue;
              }
            } else {
              enemy.x += (dx / dist) * currentSpeed;
              enemy.y += (dy / dist) * currentSpeed;
            }
            enemy.distanceTraveled += currentSpeed;
          }

          // Regen healing (flat + % of max HP so it stays relevant late game)
          if (enemy.isRegen && enemy.hp > 0 && enemy.hp < enemy.maxHp && enemy.freezeDuration <= 0) {
            const regenAmount = 0.1 + enemy.maxHp * 0.0001;
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + regenAmount);
          }

          // Healer: heals nearby allies (flat + % scaling)
          if (enemy.isHealer && enemy.hp > 0 && enemy.freezeDuration <= 0) {
            const healAmount = 0.08 + enemy.maxHp * 0.00008;
            enemiesRef.current.forEach((ally) => {
              if (ally.id !== enemy.id && ally.hp > 0 && ally.hp < ally.maxHp && getDistance(enemy.x, enemy.y, ally.x, ally.y) <= 80) {
                ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);
              }
            });
          }

          // Check mines
          for (let mi = minesRef.current.length - 1; mi >= 0; mi--) {
            const mine = minesRef.current[mi];
            if (getDistance(enemy.x, enemy.y, mine.x, mine.y) <= mine.triggerRadius) {
              // Camo mines only trigger on camo enemies if the tower can see camo
              if ((enemy.isCamo || enemy.isPhantomCamo) && !mine.camoDetection) continue;

              const applyMineDamage = (target: ActiveEnemy, dmg: number) => {
                if (mine.ignoresArmor) { /* no reduction */ }
                else if (target.isSuperArmored && !mine.ignoresArmor) dmg = Math.floor(dmg * (1 - 0.75 * (1 - (mine.armorPierce || 0))));
                else if (target.isArmored && !mine.ignoresArmor) dmg = Math.floor(dmg * (1 - 0.5 * (1 - (mine.armorPierce || 0))));
                if (target.damageReduce) dmg = Math.floor(dmg * (1 - target.damageReduce));
                if (dmg <= 0) return 0;
                target.hp -= dmg;
                addTowerXpById(mine.towerId, dmg * 0.02);
                if (mine.slowAmount) {
                  target.gasSlowDuration = Math.max(target.gasSlowDuration || 0, 60);
                  target.gasSlowFactor = Math.max(target.gasSlowFactor || 0, mine.slowAmount);
                }
                if (mine.freezeChance && !target.stunImmune && !(target.freezeDuration > 0) && getPureRandom() < mine.freezeChance) {
                  target.freezeDuration = mine.freezeDuration || 60;
                }
                if (mine.disableAbilities) { target.isGlitching = false; }
                if (mine.damageDebuff) target.damageDebuff = applyDamageDebuffCap(target.damageDebuff, mine.damageDebuff);
                if (target.hp <= 0) {
                  const sourceTower = towersRef.current.find(t => t.id === mine.towerId);
                  if (sourceTower) sourceTower.totalKills++;
                }
                return dmg;
              };

              if (mine.explodes) {
                // Exploding mine: AoE blast and then destroyed
                spawnHitParticles(mine.x, mine.y, "#ef4444", 15, "square");
                spawnFloatingText(mine.x, mine.y - 15, "💥 МІНА!", "#ef4444");

                let hitCount = 0;
                enemiesRef.current.forEach((e) => {
                  if (e.hp <= 0 || hitCount >= mine.pierce) return;
                  if ((e.isCamo || e.isPhantomCamo) && !mine.camoDetection) return;
                  if (getDistance(e.x, e.y, mine.x, mine.y) <= mine.radius) {
                    applyMineDamage(e, mine.damage);
                    hitCount++;
                  }
                });

                minesRef.current.splice(mi, 1);
                if (settingsRef.current.screenShake) screenShakeRef.current = { x: 0, y: 0, intensity: 3, duration: 5 };
                playTowerSound("explosion");
              } else {
                // Stacking trap: damages each enemy once, loses durability
                if (!mine.hitEnemyIds.includes(enemy.id)) {
                  const dmg = applyMineDamage(enemy, mine.damage);
                  mine.hitEnemyIds.push(enemy.id);
                  mine.pierce--;
                  spawnHitParticles(enemy.x, enemy.y, "#ef4444", 5, "square");
                  spawnFloatingText(enemy.x, enemy.y - 10, `-${dmg}`, "#ef4444");
                  if (mine.pierce <= 0) {
                    minesRef.current.splice(mi, 1);
                  }
                }
              }
            }
          }

          // Glitching effect for Infinix-brat
          if (enemy.isGlitching && !((enemy.abilitiesDisabledDuration || 0) > 0)) {
            enemy.timeSinceGlitch = (enemy.timeSinceGlitch || 0) + 1;
            if (enemy.timeSinceGlitch >= 150) { // every ~2.5s
              enemy.timeSinceGlitch = 0;
              
              // Teleport forward along path
              let warpRemaining = enemy.glitchDistance || 45;
              const route = getEnemyRoute(enemy);
              while (warpRemaining > 0 && enemy.pathIndex < route.points.length) {
                const target = route.points[enemy.pathIndex];
                const wdist = getDistance(enemy.x, enemy.y, target.x, target.y);
                if (wdist <= warpRemaining) {
                  enemy.x = target.x;
                  enemy.y = target.y;
                  enemy.pathIndex++;
                  warpRemaining -= wdist;
                  enemy.distanceTraveled += wdist;
                } else {
                  enemy.x += ((target.x - enemy.x) / wdist) * warpRemaining;
                  enemy.y += ((target.y - enemy.y) / wdist) * warpRemaining;
                  enemy.distanceTraveled += warpRemaining;
                  warpRemaining = 0;
                }
              }
              // glitch particles
              spawnHitParticles(enemy.x, enemy.y, "#d8b4fe", 10, "square");
            }
          }

          // Spawning speed trail for Rachky-brat
          if (enemy.isSpawningTrail && !((enemy.abilitiesDisabledDuration || 0) > 0) && getPureRandom() < 0.15) {
            speedTrailsRef.current.push({
              x: enemy.x,
              y: enemy.y,
              radius: 40,
              life: 120 // 2 seconds
            });
          }
        }

        // --- 4. TOWERS TARGET & FIRE ---
        // Pre-calculate Nescafe Ritual buffs on nearby towers
        updateCoffeeBuffs(towersRef.current);

        const towers = towersRef.current;
        towers.forEach((tower) => {
          if (isWaveActiveRef.current && frameCountRef.current % 60 === 0) {
            addTowerXp(tower.type, 0.5);
          }
          // Check if affected by Gas Brat debuff (slow attack rate)
          let speedDebuff = 1.0;
          enemiesRef.current.forEach((enemy) => {
            if (enemy.isSlowingTowers) {
              const dist = getDistance(tower.x, tower.y, enemy.x, enemy.y);
              if (dist <= 120) { // range of Gas Brat smell aura
                speedDebuff = Math.min(speedDebuff, 0.6); // 40% slow
              }
            }
          });

          // Tick cooldown
          if (tower.cooldown > 0) {
            // attack speed boosted by coffee buff, slowed by gas smell
            const cooldownSpeed = (1 + (tower.coffeeBuffMultiplier || 0)) * speedDebuff;
            tower.cooldown = Math.max(0, tower.cooldown - cooldownSpeed);
          }

          // Check if tower is stunned
          if (tower.stunDuration && tower.stunDuration > 0) {
            tower.stunDuration--;
            return; // Skip this tower's attack
          }

          // Economy/support-only towers and zero-damage utilities do not shoot.
          if (isSupportTowerType(tower.type) || tower.damage <= 0) return;

          // Кладмен throws mines onto the path
          if (tower.type === "kladmen") {
            if (tower.cooldown <= 0) {
              tower.cooldown = tower.fireRate * 60;
              const effectiveRange = getEffectiveTowerRange(tower);

              // Find a path segment within range
              const maxMines = tower.maxMines ?? 10;
              const placedMines = minesRef.current.filter(m => m.towerId === tower.id).length;
              const flyingMines = mineProjectilesRef.current.filter(p => p.towerId === tower.id).length;
              if (placedMines + flyingMines < maxMines) {
                // Collect all valid path points within range
                const validPoints: { x: number; y: number }[] = [];
                getActiveMap().routes.forEach((route) => {
                  for (let pi = 0; pi < route.points.length - 1; pi++) {
                    const a = route.points[pi], b = route.points[pi + 1];
                    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
                    const step = Math.max(6, segLen / 10);
                    const steps = Math.ceil(segLen / step);
                    for (let si = 0; si <= steps; si++) {
                      const t = si / steps;
                      const px = a.x + (b.x - a.x) * t;
                      const py = a.y + (b.y - a.y) * t;
                      if (getDistance(tower.x, tower.y, px, py) <= effectiveRange) {
                        const tooClose = minesRef.current.some(m => getDistance(m.x, m.y, px, py) < 30) ||
                          mineProjectilesRef.current.some(p => getDistance(p.targetX, p.targetY, px, py) < 30);
                        if (!tooClose) {
                          validPoints.push({ x: px, y: py });
                        }
                      }
                    }
                  }
                });

                if (validPoints.length > 0) {
                  const chosen = validPoints[Math.floor(getPureRandom() * validPoints.length)];
                  const bestX = chosen.x + (getPureRandom() - 0.5) * 10;
                  const bestY = chosen.y + (getPureRandom() - 0.5) * 10;
                  // Throw a mine projectile; it becomes a placed mine on landing
                  mineProjectilesRef.current.push({
                    id: getPureId(),
                    x: tower.x,
                    y: tower.y,
                    startX: tower.x,
                    startY: tower.y,
                    targetX: bestX,
                    targetY: bestY,
                    progress: 0,
                    speed: 0.06,
                    color: tower.color,
                    towerId: tower.id
                  });
                }
              }
            }
            return;
          }

          const isCamoCapable = tower.camoDetection || tower.hasCamoBuff;

          // Gas is a tack-shooter analog: short radial bursts, no passive aura damage.
          if (tower.type === "gas") {
            if (tower.cooldown <= 0) {
              tower.cooldown = tower.fireRate * 60;
              const effectiveRange = getEffectiveTowerRange(tower);
              const effectiveDamage = getEffectiveTowerDamage(tower);
              const tackCount = tower.tackCount || 6;
              for (let ti = 0; ti < tackCount; ti++) {
                const angle = (Math.PI * 2 * ti) / tackCount + frameCountRef.current * 0.01;
                projectilesRef.current.push({
                  id: `${getPureId()}_${ti}`,
                  type: "gas",
                  x: tower.x,
                  y: tower.y,
                  targetId: "",
                  speed: 6,
                  damage: effectiveDamage,
                  emoji: tower.emoji,
                  color: tower.color,
                  towerId: tower.id,
                  damageDebuff: tower.damageDebuff,
                  freezeChance: tower.freezeChance,
                  slowAmount: tower.slowAmount || 0.15,
                  gachaChance: tower.gachaChance,
                  gachaDamageOverride: tower.gachaDamageOverride,
                  ignoresArmor: tower.ignoresArmor,
                  armorPierce: tower.coffeeIgnoreArmorBuff,
                  antiArmor: tower.antiArmor,
                  disableGlitch: tower.disableGlitch,
                  disableAbilities: tower.disableAbilities,
                  pierce: tower.pierce || 1,
                  hitEnemyIds: [],
                  camoDetection: isCamoCapable,
                  angle,
                  lastTargetX: tower.x + Math.cos(angle) * effectiveRange,
                  lastTargetY: tower.y + Math.sin(angle) * effectiveRange,
                  spinRotation: angle,
                  travelDistance: 0,
                  maxDistance: effectiveRange
                });
              }
            }
            return;
          }

          // Boomerang: curved projectile that hits on the way out and back.
          if (tower.type === "boomerang") {
            if (tower.cooldown <= 0 && enemiesRef.current.length > 0) {
              const targetsInRange = enemiesRef.current.filter((e) => {
                if (e.isCamo && !isCamoCapable) return false;
                if (e.isPhantomCamo && !tower.camoDetection && !tower.hasCamoBuff) return false;
                return getDistance(tower.x, tower.y, e.x, e.y) <= getEffectiveTowerRange(tower);
              });

              if (targetsInRange.length > 0) {
                targetsInRange.sort((a, b) => b.distanceTraveled - a.distanceTraveled);
                const target = targetsInRange[0];

                tower.cooldown = tower.fireRate * 60;
                const projId = getPureId();
                const dx = target.x - tower.x;
                const dy = target.y - tower.y;
                const angle = Math.atan2(dy, dx);

                  const newProj: Projectile = {
                  id: projId,
                  type: tower.type,
                  x: tower.x,
                  y: tower.y,
                  targetId: target.id,
                  speed: 7,
                  damage: getEffectiveTowerDamage(tower),
                  emoji: tower.emoji,
                  color: tower.color,
                  towerId: tower.id,
                  ignoresArmor: tower.ignoresArmor,
                  armorPierce: tower.coffeeIgnoreArmorBuff,
                  freezeChance: tower.freezeChance,
                  freezeDurationBonus: tower.freezeDurationBonus,
                  disableAbilities: tower.disableAbilities,
                  critChance: tower.critChance,
                  critMultiplier: tower.critMultiplier,
                  pierce: tower.pierce || 1,
                  hitEnemyIds: [],
                  camoDetection: isCamoCapable,
                  angle,
                  lastTargetX: target.x,
                  lastTargetY: target.y,
                  spinRotation: angle,
                  travelDistance: 0,
                  maxDistance: getEffectiveTowerRange(tower),
                  originX: tower.x,
                  originY: tower.y
                };

                // Double/Triple-shot logic
                if (tower.alwaysDouble || tower.twoHits) {
                  const shotCount = tower.shotCount || 0;
                  if (tower.twoHits) tower.shotCount = shotCount + 1;
                  if (tower.alwaysDouble || (shotCount + 1) % 3 === 0) {
                    const isTriple = tower.conditionalTripleWithPierce && (tower.pierce >= 4);
                    if (isTriple) {
                      // Fire 2 additional projectiles (left and right) to make it 3 total
                      const leftProj = {
                        ...newProj,
                        id: projId + "_L",
                        angle: angle - 0.25,
                        spinRotation: angle - 0.25,
                        x: tower.x + Math.cos(angle - Math.PI/2) * 8,
                        y: tower.y + Math.sin(angle - Math.PI/2) * 8
                      };
                      const rightProj = {
                        ...newProj,
                        id: projId + "_R",
                        angle: angle + 0.25,
                        spinRotation: angle + 0.25,
                        x: tower.x + Math.cos(angle + Math.PI/2) * 8,
                        y: tower.y + Math.sin(angle + Math.PI/2) * 8
                      };
                      projectilesRef.current.push(leftProj, rightProj);
                    } else {
                      // Fire 1 additional projectile (right) to make it 2 total
                      const rightProj = {
                        ...newProj,
                        id: projId + "_2",
                        angle: angle + 0.25,
                        spinRotation: angle + 0.25,
                        x: tower.x + Math.cos(angle + Math.PI/2) * 8,
                        y: tower.y + Math.sin(angle + Math.PI/2) * 8
                      };
                      projectilesRef.current.push(rightProj);
                    }
                  }
                }

                projectilesRef.current.push(newProj);

                // Muzzle flash particles
                for (let mi = 0; mi < 5; mi++) {
                  particlesRef.current.push({
                    x: tower.x,
                    y: tower.y,
                    vx: Math.cos(angle + (Math.random() - 0.5) * 0.8) * (Math.random() * 3 + 2),
                    vy: Math.sin(angle + (Math.random() - 0.5) * 0.8) * (Math.random() * 3 + 2),
                    color: tower.color,
                    size: Math.random() * 3 + 1,
                    life: 8,
                    maxLife: 8
                  });
                }
              }
            }
            return;
          }

          // Target selection for projectile towers (Hammer, Candy, Infinix)
          if (tower.cooldown <= 0 && enemiesRef.current.length > 0) {
            // Find enemies in range
            const targetsInRange = enemiesRef.current.filter((e) => {
              if (e.isCamo && !isCamoCapable) return false;
              // Phantom camo requires higher level detection
              if (e.isPhantomCamo && !tower.camoDetection && !tower.hasCamoBuff) return false;
              return getDistance(tower.x, tower.y, e.x, e.y) <= getEffectiveTowerRange(tower);
            });

            if (targetsInRange.length > 0) {
              // Apply targeting mode
              const mode = tower.targetingMode || "first";
              if (mode === "first") {
                targetsInRange.sort((a, b) => b.distanceTraveled - a.distanceTraveled);
              } else if (mode === "last") {
                targetsInRange.sort((a, b) => a.distanceTraveled - b.distanceTraveled);
              } else if (mode === "strongest") {
                targetsInRange.sort((a, b) => b.hp - a.hp);
              } else if (mode === "nearest") {
                targetsInRange.sort((a, b) => getDistance(tower.x, tower.y, a.x, a.y) - getDistance(tower.x, tower.y, b.x, b.y));
              }
              const target = targetsInRange[0];

              // Fire!
              tower.cooldown = tower.fireRate * 60; // reset frame cooldown

              // Projectile details
              const projId = getPureId();
              const dx = target.x - tower.x;
              const dy = target.y - tower.y;
              const angle = Math.atan2(dy, dx);

              const newProj: Projectile = {
                id: projId,
                type: tower.type,
                x: tower.x,
                y: tower.y,
                targetId: target.id,
                speed: tower.type === "infinix" ? 14 : 7, // Infinix beam is very fast
                damage: getEffectiveTowerDamage(tower),
                emoji: tower.emoji,
                color: tower.color,
                towerId: tower.id,
                critChance: tower.critChance,
                isAoESlow: tower.isAoESlow,
                damageDebuff: tower.damageDebuff,
                freezeChance: tower.freezeChance,
                slowAmount: tower.slowAmount,
                gachaChance: tower.gachaChance,
                copilotBug: tower.copilotBug,
                ignoresArmor: tower.ignoresArmor,
                armorPierce: tower.coffeeIgnoreArmorBuff,
                alwaysDouble: tower.alwaysDouble,
                critMultiplier: tower.critMultiplier,
                slowDurationBonus: tower.slowDurationBonus,
                slowFactorBonus: tower.slowFactorBonus,
                explodeDmg: tower.explodeDmg,
                gachaDamageOverride: tower.gachaDamageOverride,
                freezeDurationBonus: tower.freezeDurationBonus,
                bsodAoE: tower.bsodAoE,
                disableAbilities: tower.disableAbilities,
                bugExplodeDmg: tower.bugExplodeDmg,
                bugExplodeRadius: tower.bugExplodeRadius,
                bugContagion: tower.bugContagion,
                angle,
                lastTargetX: target.x,
                lastTargetY: target.y,
                pierce: tower.pierce || 1,
                hitEnemyIds: [],
                camoDetection: isCamoCapable,
                spinRotation: angle,
                knockbackChance: tower.knockbackChance,
                knockbackDistance: tower.knockbackDistance,
                microStunDuration: tower.microStunDuration,
                wallBounce: tower.wallBounce,
                tripleShot: tower.tripleShot,
                quadShot: tower.quadShot,
                everyNthTriple: tower.everyNthTriple,
                spreadChance: tower.spreadChance,
                spreadDamageBonus: tower.spreadDamageBonus,
                gachaDamageMultiplier: tower.gachaDamageMultiplier,
                conditionalTripleWithPierce: tower.conditionalTripleWithPierce
              };

              // Multishot logic (Quad, Triple, Double)
              const shotCount = tower.shotCount || 0;
              tower.shotCount = shotCount + 1;

              if (tower.quadShot) {
                const angles = [angle - 0.3, angle - 0.1, angle + 0.1, angle + 0.3];
                angles.forEach((a, idx) => {
                  projectilesRef.current.push({
                    ...newProj,
                    id: `${projId}_quad_${idx}`,
                    angle: a,
                    spinRotation: a,
                    x: tower.x + Math.cos(a + Math.PI/2) * 4,
                    y: tower.y + Math.sin(a + Math.PI/2) * 4
                  });
                });
              } else if (tower.tripleShot || (tower.everyNthTriple && (shotCount + 1) % tower.everyNthTriple === 0)) {
                const angles = [angle - 0.25, angle, angle + 0.25];
                angles.forEach((a, idx) => {
                  projectilesRef.current.push({
                    ...newProj,
                    id: `${projId}_triple_${idx}`,
                    angle: a,
                    spinRotation: a,
                    x: tower.x + Math.cos(a + Math.PI/2) * 4,
                    y: tower.y + Math.sin(a + Math.PI/2) * 4
                  });
                });
              } else if (tower.alwaysDouble || (tower.twoHits && (shotCount + 1) % 3 === 0)) {
                const offsetProj = {
                  ...newProj,
                  id: projId + "_2",
                  angle: angle + 0.25,
                  spinRotation: angle + 0.25,
                  x: tower.x + Math.cos(angle + Math.PI/2) * 8,
                  y: tower.y + Math.sin(angle + Math.PI/2) * 8
                };
                projectilesRef.current.push(offsetProj);
                projectilesRef.current.push(newProj);
              } else {
                projectilesRef.current.push(newProj);
              }

              // Muzzle flash particles
              for (let mi = 0; mi < 5; mi++) {
                particlesRef.current.push({
                  x: tower.x,
                  y: tower.y,
                  vx: Math.cos(angle + (Math.random() - 0.5) * 0.8) * (Math.random() * 3 + 2),
                  vy: Math.sin(angle + (Math.random() - 0.5) * 0.8) * (Math.random() * 3 + 2),
                  color: tower.color,
                  size: Math.random() * 3 + 1,
                  life: 8,
                  maxLife: 8
                });
              }
            }
          }
        });

        // --- Update thrown mine projectiles ---
        for (let i = mineProjectilesRef.current.length - 1; i >= 0; i--) {
          const mp = mineProjectilesRef.current[i];
          mp.progress += mp.speed;
          mp.x = mp.startX + (mp.targetX - mp.startX) * mp.progress;
          mp.y = mp.startY + (mp.targetY - mp.startY) * mp.progress;

          if (mp.progress >= 1) {
            const sourceTower = towersRef.current.find(t => t.id === mp.towerId);
            if (sourceTower) {
              const mineDamage = getEffectiveTowerDamage(sourceTower);
              const mine: Mine = {
                id: getPureId(),
                x: mp.targetX,
                y: mp.targetY,
                damage: mineDamage,
                radius: 40 + (sourceTower.explodeDmg || 0),
                triggerRadius: 12,
                ignoresArmor: sourceTower.ignoresArmor,
                armorPierce: sourceTower.coffeeIgnoreArmorBuff,
                slowAmount: sourceTower.slowAmount,
                freezeChance: sourceTower.freezeChance,
                freezeDuration: sourceTower.freezeDurationBonus,
                disableAbilities: sourceTower.disableAbilities,
                damageDebuff: sourceTower.damageDebuff ? 1.25 : undefined,
                pierce: sourceTower.pierce || 2,
                towerId: sourceTower.id,
                hitEnemyIds: [],
                explodes: !!sourceTower.mineExplodes,
                camoDetection: sourceTower.camoDetection || sourceTower.hasCamoBuff,
              };
              minesRef.current.push(mine);
            }
            mineProjectilesRef.current.splice(i, 1);
          }
        }

        // --- 5. PROCESS PROJECTILES ---
        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
          const proj = projectilesRef.current[i];
          let snappedToTarget = false;
          let snapDistance = 0;
          
          // Homing: adjust angle toward target each frame
          if (proj.targetId) {
            const targetEnemy = enemiesRef.current.find(e => e.id === proj.targetId && e.hp > 0);
            if (targetEnemy) {
              const dx = targetEnemy.x - proj.x;
              const dy = targetEnemy.y - proj.y;
              const targetDistance = Math.hypot(dx, dy);
              const targetAngle = Math.atan2(dy, dx);
              if (targetDistance <= proj.speed) {
                proj.x = targetEnemy.x;
                proj.y = targetEnemy.y;
                proj.angle = targetAngle;
                snappedToTarget = true;
                snapDistance = targetDistance;
              } else {
                // Smooth turn toward target (max ~15 degrees per frame)
                let angleDiff = targetAngle - proj.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                const maxTurn = 0.26; // ~15 degrees
                proj.angle += Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
              }
              proj.lastTargetX = targetEnemy.x;
              proj.lastTargetY = targetEnemy.y;
            } else {
              proj.targetId = "";
            }
          }

          // Flight
          if (!snappedToTarget) {
            proj.x += Math.cos(proj.angle) * proj.speed;
            proj.y += Math.sin(proj.angle) * proj.speed;
          }
          proj.travelDistance = (proj.travelDistance || 0) + (snappedToTarget ? snapDistance : proj.speed);

          // Add trail point
          projectileTrailRef.current.push({
            x: proj.x,
            y: proj.y,
            color: proj.color,
            alpha: 0.6,
            size: 4
          });
          // Limit trail length
          if (projectileTrailRef.current.length > 200) {
            projectileTrailRef.current = projectileTrailRef.current.slice(-200);
          }

          // Boomerang: turn around at target/max range and fly back to the tower.
          if (proj.type === "boomerang") {
            const originDx = (proj.originX ?? proj.x) - proj.x;
            const originDy = (proj.originY ?? proj.y) - proj.y;
            const distToOrigin = Math.hypot(originDx, originDy);

            if (proj.isReturning) {
              proj.angle = Math.atan2(originDy, originDx);
              if (distToOrigin <= proj.speed + 2) {
                projectilesRef.current.splice(i, 1);
                continue;
              }
            } else {
              const reachedTarget = snappedToTarget;
              const reachedLastTarget = !proj.targetId && Math.hypot(proj.lastTargetX - proj.x, proj.lastTargetY - proj.y) <= proj.speed;
              const reachedMaxRange = proj.maxDistance !== undefined && proj.travelDistance >= proj.maxDistance;
              if (reachedTarget || reachedLastTarget || reachedMaxRange) {
                proj.isReturning = true;
                proj.targetId = "";
                proj.turnX = proj.x;
                proj.turnY = proj.y;
                proj.angle = Math.atan2(originDy, originDx);
              }
            }
          }

          // Wall bounce logic
          if (proj.wallBounce && !proj.hasBounced) {
            let bounced = false;
            if (proj.x < 0) {
              proj.x = 0;
              proj.angle = Math.PI - proj.angle;
              bounced = true;
            } else if (proj.x > GAME_WIDTH) {
              proj.x = GAME_WIDTH;
              proj.angle = Math.PI - proj.angle;
              bounced = true;
            }
            if (proj.y < 0) {
              proj.y = 0;
              proj.angle = -proj.angle;
              bounced = true;
            } else if (proj.y > GAME_HEIGHT) {
              proj.y = GAME_HEIGHT;
              proj.angle = -proj.angle;
              bounced = true;
            }
            if (bounced) {
              proj.hasBounced = true;
              proj.hitEnemyIds = []; // clear hit list so it can deal damage again
              proj.targetId = ""; // disable homing so it continues in straight line
              proj.spinRotation = proj.angle;
            }
          }

          // Out of bounds check
          if ((proj.maxDistance && proj.travelDistance > proj.maxDistance && proj.type !== "boomerang") || proj.x < -40 || proj.x > GAME_WIDTH + 40 || proj.y < -40 || proj.y > GAME_HEIGHT + 40) {
            projectilesRef.current.splice(i, 1);
            continue;
          }

          // Spinning effect for hammer and boomerang
          if (proj.type === "hammer") {
            proj.spinRotation = (proj.spinRotation ?? proj.angle) + 0.25;
          }
          if (proj.type === "boomerang") {
            proj.spinRotation = (proj.spinRotation ?? proj.angle) + 0.22;
          }

          // Collision detection with ALL enemies
          let hasSpliced = false;
          for (let eIdx = enemiesRef.current.length - 1; eIdx >= 0; eIdx--) {
            const enemy = enemiesRef.current[eIdx];
            if (enemy.hp <= 0) continue;
            if (enemy.isCamo && !proj.camoDetection) continue;
            
            // Check collision distance
            const colDist = getDistance(proj.x, proj.y, enemy.x, enemy.y);
            const hitRadius = proj.type === "gas" ? 12 : 8;
            if (colDist <= enemy.radius + hitRadius && !proj.hitEnemyIds.includes(enemy.id)) {
              // Hit!
              proj.hitEnemyIds.push(enemy.id);
              proj.pierce--;

              let dmg = proj.type === "chain" ? Math.max(1, Math.floor(proj.damage)) : proj.damage;

              // Shield absorption
              if (enemy.shieldHp !== undefined && enemy.shieldHp > 0) {
                const absorbed = Math.min(enemy.shieldHp, dmg);
                enemy.shieldHp -= absorbed;
                dmg -= absorbed;
                if (absorbed > 0) {
                  spawnFloatingText(enemy.x, enemy.y - 10, `🛡️ -${absorbed}`, "#0ea5e9");
                }
              }

              // Infinix random damage
              if (proj.type === "infinix") {
                dmg = Math.max(5, Math.floor(proj.damage * (0.5 + getPureRandom())));
              }

              if (proj.type === "gas" && proj.antiArmor && (enemy.isArmored || enemy.isSuperArmored) && dmg > 0) {
                dmg = Math.floor(dmg * 1.5);
              }

              // Lead armor hammer immunity
              if (enemy.isLead && proj.type === "hammer" && !proj.ignoresArmor) {
                dmg = 0;
                spawnFloatingText(enemy.x, enemy.y - 15, "IMMUNE 🔩", "#94a3b8");
                spawnHitParticles(enemy.x, enemy.y, "#9ca3af", 5);
              }

              // Apply armor reductions
              const armorIgnored = proj.ignoresArmor || false;
              if (!armorIgnored && dmg > 0) {
                const armorPierce = Math.max(0, Math.min(1, proj.armorPierce || 0));
                if (enemy.isArmored && proj.type === "hammer") {
                  dmg = Math.floor(dmg * (1 - 0.5 * (1 - armorPierce)));
                } else if (enemy.isSuperArmored && proj.type === "hammer") {
                  dmg = Math.floor(dmg * (1 - 0.75 * (1 - armorPierce)));
                }
              }

              // Check Criticals
              let isCrit = false;
              if (dmg > 0 && proj.critChance && getPureRandom() < proj.critChance) {
                const mult = proj.critMultiplier || 3;
                dmg *= mult;
                isCrit = true;
                playPdrSound();
              }

              // Check Gacha jackpot
              if (dmg > 0 && proj.gachaChance && getPureRandom() < proj.gachaChance) {
                if (proj.gachaDamageMultiplier) {
                  dmg = Math.floor(proj.damage * proj.gachaDamageMultiplier);
                } else {
                  dmg = proj.gachaDamageOverride || 300;
                }
                isCrit = true;
                playPdrSound();
              }

              // Apply damage debuff if active on enemy
              if (enemy.damageDebuff && dmg > 0) {
                dmg = Math.floor(dmg * enemy.damageDebuff);
              }

              // Apply tier damage reduction
              if (enemy.damageReduce && enemy.damageReduce > 0 && dmg > 0) {
                dmg = Math.floor(dmg * (1 - enemy.damageReduce));
              }

              // Apply damage
              const wasAlive = enemy.hp > 0;
              enemy.hp -= dmg;
              if (dmg > 0) addTowerXpById(proj.towerId, dmg * 0.02);
              enemy.lastHitFrame = frameCountRef.current;

              // Damage numbers
              const typeColors: Record<string, string> = {
                hammer: "#ffffff",
                candy: "#f472b6",
                infinix: "#c084fc",
                gas: "#4ade80",
                sniper: "#facc15",
                chain: "#38bdf8",
                kladmen: "#fb923c",
                bankomat: "#a1a1aa",
                monolith: "#f87171",
                boomerang: "#fbbf24"
              };
              if (dmg > 0) {
                const color = isCrit ? "#f43f5e" : (typeColors[proj.type] || "#ffffff");
                const size = isCrit ? 15 : 11;
                spawnFloatingText(enemy.x + (Math.random() - 0.5) * 10, enemy.y - 10 - (isCrit ? 12 : 0), `-${dmg}`, color, size);
              }

              // Apply status effects
              if (proj.type === "candy") {
                enemy.slowDuration = Math.max(enemy.slowDuration, 120 + (proj.slowDurationBonus || 0));
                enemy.candySlowFactor = Math.max(enemy.candySlowFactor || 0, Math.min(0.85, 0.5 + (proj.slowFactorBonus || 0)));
                
                if (proj.damageDebuff) {
                  enemy.damageDebuff = applyDamageDebuffCap(enemy.damageDebuff, proj.damageDebuff);
                }

                if (proj.microStunDuration && !enemy.stunImmune && !(enemy.freezeDuration > 0)) {
                  enemy.freezeDuration = proj.microStunDuration;
                  spawnFloatingText(enemy.x, enemy.y - 15, "⏱️ СТАН", "#f472b6");
                }

                // Candy P3T5 spread logic
                if (proj.spreadChance && getPureRandom() < proj.spreadChance) {
                  const neighbors = enemiesRef.current.filter((other) => 
                    other.id !== enemy.id && 
                    other.hp > 0 &&
                    (!other.isCamo || proj.camoDetection) &&
                    (!other.isPhantomCamo || proj.camoDetection) &&
                    getDistance(enemy.x, enemy.y, other.x, other.y) <= 60 &&
                    !proj.hitEnemyIds.includes(other.id)
                  );
                  if (neighbors.length > 0) {
                    const neighbor = neighbors[Math.floor(getPureRandom() * neighbors.length)];
                    proj.hitEnemyIds.push(neighbor.id);
                    
                    neighbor.slowDuration = Math.max(neighbor.slowDuration, 120 + (proj.slowDurationBonus || 0));
                    neighbor.candySlowFactor = Math.max(neighbor.candySlowFactor || 0, Math.min(0.85, 0.5 + (proj.slowFactorBonus || 0)));
                    
                    if (proj.microStunDuration && !neighbor.stunImmune && !(neighbor.freezeDuration > 0)) {
                      neighbor.freezeDuration = proj.microStunDuration;
                      spawnFloatingText(neighbor.x, neighbor.y - 15, "⏱️ СТАН", "#f472b6");
                    }
                    
                    let splashDmg = proj.damage;
                    if (neighbor.shieldHp !== undefined && neighbor.shieldHp > 0) {
                      const absorbed = Math.min(neighbor.shieldHp, splashDmg);
                      neighbor.shieldHp -= absorbed;
                      splashDmg -= absorbed;
                    }
                    if (neighbor.damageDebuff && splashDmg > 0) splashDmg = Math.floor(splashDmg * neighbor.damageDebuff);
                    if (neighbor.damageReduce && splashDmg > 0) splashDmg = Math.floor(splashDmg * (1 - neighbor.damageReduce));
                    neighbor.hp -= splashDmg;
                    if (splashDmg > 0) addTowerXpById(proj.towerId, splashDmg * 0.02);
                    if (splashDmg > 0) {
                      spawnFloatingText(neighbor.x, neighbor.y - 10, `-${splashDmg}`, "#f472b6", 11);
                    }
                    
                    spawnHitParticles(neighbor.x, neighbor.y, "#f472b6", 6);
                    const particleCount = 5;
                    for (let pi = 0; pi <= particleCount; pi++) {
                      const t = pi / particleCount;
                      particlesRef.current.push({
                        x: enemy.x + (neighbor.x - enemy.x) * t,
                        y: enemy.y + (neighbor.y - enemy.y) * t,
                        vx: (Math.random() - 0.5) * 0.5,
                        vy: (Math.random() - 0.5) * 0.5,
                        color: "#f472b6",
                        size: 2,
                        life: 15,
                        maxLife: 15
                      });
                    }
                  }
                }

                if (proj.isAoESlow) {
                  const candyRadius = proj.explodeDmg && proj.explodeDmg >= 80 ? 150 : proj.explodeDmg ? 100 : 60;
                  // slow nearby enemies and apply promised explosion damage
                  enemiesRef.current.forEach((other) => {
                    if (getDistance(enemy.x, enemy.y, other.x, other.y) <= candyRadius) {
                      other.slowDuration = Math.max(other.slowDuration, 90 + (proj.slowDurationBonus || 0));
                      other.candySlowFactor = Math.max(other.candySlowFactor || 0, Math.min(0.85, 0.5 + (proj.slowFactorBonus || 0)));
                      if (proj.damageDebuff) {
                        other.damageDebuff = applyDamageDebuffCap(other.damageDebuff, proj.damageDebuff);
                      }
                      if (proj.explodeDmg && other.id !== enemy.id) {
                        let splashDmg = proj.explodeDmg;
                        if (other.shieldHp !== undefined && other.shieldHp > 0) {
                          const absorbed = Math.min(other.shieldHp, splashDmg);
                          other.shieldHp -= absorbed;
                          splashDmg -= absorbed;
                        }
                        if (other.damageDebuff && splashDmg > 0) splashDmg = Math.floor(splashDmg * other.damageDebuff);
                        if (other.damageReduce && splashDmg > 0) splashDmg = Math.floor(splashDmg * (1 - other.damageReduce));
                        other.hp -= splashDmg;
                        if (splashDmg > 0) addTowerXpById(proj.towerId, splashDmg * 0.02);
                      }
                    }
                  });
                  spawnHitParticles(enemy.x, enemy.y, "#f97316", 12);
                }
              }

              if (proj.type === "gas") {
                enemy.gasSlowDuration = Math.max(enemy.gasSlowDuration, 45);
                enemy.gasSlowFactor = Math.max(enemy.gasSlowFactor || 0, proj.slowAmount || 0.15);
                if (proj.damageDebuff) {
                  enemy.damageDebuff = applyDamageDebuffCap(enemy.damageDebuff, proj.damageDebuff);
                }
                if (proj.disableAbilities) {
                  enemy.abilitiesDisabledDuration = Math.max(enemy.abilitiesDisabledDuration || 0, 180);
                }
                if (proj.disableGlitch) {
                  enemy.isGlitching = false;
                }
              }

              if (proj.type === "infinix") {
                if (proj.freezeChance && getPureRandom() < proj.freezeChance && !enemy.stunImmune && !(enemy.freezeDuration > 0)) {
                  enemy.freezeDuration = 60 + (proj.freezeDurationBonus || 0);
                  spawnFloatingText(enemy.x, enemy.y - 15, "ЛАГ 999мс", "#c084fc");
                  if (proj.bsodAoE) {
                    enemiesRef.current.forEach((other) => {
                      if (other.id !== enemy.id && getDistance(enemy.x, enemy.y, other.x, other.y) <= 80) {
                        other.gasSlowDuration = Math.max(other.gasSlowDuration, 60);
                        other.gasSlowFactor = Math.max(other.gasSlowFactor || 0, 0.35);
                      }
                    });
                  }
                }
                
                if (proj.copilotBug) {
                  enemy.hasCopilotBug = true;
                  enemy.bugExplodeDmg = proj.bugExplodeDmg || 50;
                  enemy.bugExplodeRadius = proj.bugExplodeRadius || 80;
                  enemy.bugContagion = proj.bugContagion || false;
                }
              }

              if (proj.type === "chain" || proj.type === "monolith" || proj.type === "boomerang") {
                if (proj.freezeChance && getPureRandom() < proj.freezeChance && !enemy.stunImmune && !(enemy.freezeDuration > 0)) {
                  enemy.freezeDuration = 30 + (proj.freezeDurationBonus || 0);
                  spawnFloatingText(enemy.x, enemy.y - 15, "⚡ СТАН", "#38bdf8");
                }
                if (proj.slowAmount) {
                  enemy.gasSlowDuration = Math.max(enemy.gasSlowDuration, 60);
                  enemy.gasSlowFactor = Math.max(enemy.gasSlowFactor || 0, proj.slowAmount);
                }
                if (proj.disableAbilities) {
                  enemy.isGlitching = false;
                }
              }

              // Apply knockback
              if (proj.knockbackChance && getPureRandom() < proj.knockbackChance && !enemy.knockbackImmune) {
                const kbDist = proj.knockbackDistance || 50;
                enemy.distanceTraveled = Math.max(0, enemy.distanceTraveled - kbDist);
                const route = getEnemyRoute(enemy);
                const position = getRouteDistancePosition(route.points, enemy.distanceTraveled);
                enemy.x = position.x;
                enemy.y = position.y;
                enemy.pathIndex = position.pathIndex;
                
                spawnFloatingText(enemy.x, enemy.y - 15, "💥 ВІДКИД", "#c084fc");
                spawnHitParticles(enemy.x, enemy.y, "#d8b4fe", 8, "square");
              }

              if ((proj.type === "sniper" || proj.type === "monolith") && proj.explodeDmg) {
                const explosionRadius = proj.explodeDmg >= 200 ? 120 : 50;
                enemiesRef.current.forEach((other) => {
                  if (other.id === enemy.id || other.hp <= 0) return;
                  if (getDistance(enemy.x, enemy.y, other.x, other.y) > explosionRadius) return;
                  let splashDmg = proj.explodeDmg || 0;
                  if (other.shieldHp !== undefined && other.shieldHp > 0) {
                    const absorbed = Math.min(other.shieldHp, splashDmg);
                    other.shieldHp -= absorbed;
                    splashDmg -= absorbed;
                  }
                  if (!proj.ignoresArmor && splashDmg > 0) {
                    const armorPierce = Math.max(0, Math.min(1, proj.armorPierce || 0));
                    if (other.isArmored) splashDmg = Math.floor(splashDmg * (1 - 0.5 * (1 - armorPierce)));
                    else if (other.isSuperArmored) splashDmg = Math.floor(splashDmg * (1 - 0.75 * (1 - armorPierce)));
                  }
                  if (other.damageDebuff && splashDmg > 0) splashDmg = Math.floor(splashDmg * other.damageDebuff);
                  if (other.damageReduce && splashDmg > 0) splashDmg = Math.floor(splashDmg * (1 - other.damageReduce));
                  other.hp -= splashDmg;
                  if (splashDmg > 0) addTowerXpById(proj.towerId, splashDmg * 0.02);
                });
                spawnHitParticles(enemy.x, enemy.y, "#f43f5e", 14, "square");
              }

              // Floating texts
              if (isCrit) {
                spawnFloatingText(enemy.x, enemy.y - 25, "ПОЧУВ! CRIT", "#f43f5e");
              }

              // Check kill
              if (wasAlive && enemy.hp <= 0) {
                const sourceTower = towersRef.current
                  .filter((t) => t.type === proj.type && getDistance(t.x, t.y, enemy.x, enemy.y) <= getEffectiveTowerRange(t) + 40)
                  .sort((a, b) => getDistance(a.x, a.y, enemy.x, enemy.y) - getDistance(b.x, b.y, enemy.x, enemy.y))[0];
                
                if (sourceTower) {
                  sourceTower.totalKills++;
                }
              }

              // Trigger particles
              spawnHitParticles(enemy.x, enemy.y, proj.color, 6);

              if (proj.type === "chain" && proj.pierce > 0) {
                proj.damage = Math.max(1, proj.damage * 0.8);
              }

              // Check if projectile is depleted
              if (proj.pierce <= 0) {
                projectilesRef.current.splice(i, 1);
                hasSpliced = true;
                break;
              } else {
                // Boomerang: after moving away from the turnaround point, reset hit list so it can strike the same enemies again on the way back.
                if (proj.type === "boomerang" && proj.isReturning && !proj.returnHitReset) {
                  const turnDx = proj.x - (proj.turnX ?? proj.x);
                  const turnDy = proj.y - (proj.turnY ?? proj.y);
                  if (Math.hypot(turnDx, turnDy) > 25) {
                    proj.hitEnemyIds = [];
                    proj.returnHitReset = true;
                  }
                }

                // Homing Ricochet to next target (skip for returning boomerang)
                if (proj.type !== "boomerang" || !proj.isReturning) {
                  const nextTarget = enemiesRef.current
                    .filter((other) => other.hp > 0 && !proj.hitEnemyIds.includes(other.id) && getDistance(proj.x, proj.y, other.x, other.y) <= 120 && !(other.isCamo && !proj.camoDetection))
                    .sort((a, b) => getDistance(proj.x, proj.y, a.x, a.y) - getDistance(proj.x, proj.y, b.x, b.y))[0];

                  if (nextTarget) {
                    proj.targetId = nextTarget.id;
                    proj.lastTargetX = nextTarget.x;
                    proj.lastTargetY = nextTarget.y;
                    proj.angle = Math.atan2(nextTarget.y - proj.y, nextTarget.x - proj.x);
                  } else {
                    proj.targetId = "";
                  }
                }
              }
            }
          }

          if (hasSpliced) continue;
        }

        // --- 6. UNIFIED DEAD ENEMIES CLEANUP ---
        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
          const enemy = enemiesRef.current[i];
            if (enemy.hp <= 0) {
            waveKillsRef.current++;
            if (enemy.type === "boss") addPlayerXp(100);
            if (enemy.type === "megaboss") addPlayerXp(300);
            // Reward gold
            setGold((prev) => prev + enemy.reward);
            setScore((prev) => prev + 1);
            spawnFloatingText(enemy.x, enemy.y, `+${enemy.reward} ☕`, "#eab308");

            // Check Copilot Bug explosion
            if (enemy.hasCopilotBug) {
              const explodeDmg = enemy.bugExplodeDmg || 50;
              const explodeRad = enemy.bugExplodeRadius || 80;
              spawnFloatingText(enemy.x, enemy.y - 15, "BUG EXPLOSION!", "#a855f7");
              spawnHitParticles(enemy.x, enemy.y, "#a855f7", 15, "square");

              // Damage nearby enemies
              enemiesRef.current.forEach((other) => {
                if (other.id !== enemy.id && other.hp > 0 && getDistance(enemy.x, enemy.y, other.x, other.y) <= explodeRad) {
                  const wasAliveOther = other.hp > 0;
                  other.hp -= explodeDmg;
                  // If other dies from explosion, attribute kill to nearest Infinix tower
                  if (wasAliveOther && other.hp <= 0) {
                    const sourceTower = towersRef.current
                      .filter((t) => t.type === "infinix" && getDistance(t.x, t.y, other.x, other.y) <= t.range + 40)
                      .sort((a, b) => getDistance(a.x, a.y, other.x, other.y) - getDistance(b.x, b.y, other.x, other.y))[0];
                    if (sourceTower) {
                      sourceTower.totalKills++;
                    }

                    // Spread the bug if bugContagion is active
                    if (enemy.bugContagion) {
                      other.hasCopilotBug = true;
                      other.bugExplodeDmg = enemy.bugExplodeDmg;
                      other.bugExplodeRadius = enemy.bugExplodeRadius;
                      other.bugContagion = true;
                    }
                  }
                }
              });
            }

            // Spawn minions if boss
            if (enemy.onDeath) {
              enemy.onDeath(enemy.x, enemy.y, (type, rx, ry, modifiers) => spawnEnemyCallback(type, rx, ry, modifiers, enemy.routeId));
            }

            // Exploder stun
            if (enemy.isExploder) {
              towersRef.current.forEach((t) => {
                if (getDistance(enemy.x, enemy.y, t.x, t.y) <= 80) {
                  t.stunDuration = 90; // 1.5 seconds at 60fps
                }
              });
              spawnFloatingText(enemy.x, enemy.y - 20, "💥 ОГЛУШЕННЯ!", "#f97316");
              spawnHitParticles(enemy.x, enemy.y, "#f97316", 20, "square");
            }

            // Screen shake on boss kill
            if (enemy.type === "boss" || enemy.type === "megaboss") {
              if (settingsRef.current.screenShake) screenShakeRef.current = { x: 0, y: 0, intensity: enemy.type === "megaboss" ? 12 : 8, duration: 20 };
            }

            // Explosion ring on death
            explosionRingsRef.current.push({
              x: enemy.x, y: enemy.y,
              radius: 5, maxRadius: 40,
              color: enemy.borderColor || "#ef4444",
              life: 20
            });

            // Remove enemy from list
            enemiesRef.current.splice(i, 1);
          }
        }
      }
    };

    const renderGame = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const themeIdx = Math.floor((waveRef.current - 1) / 10) % SCENE_THEMES.length;
      const theme = SCENE_THEMES[themeIdx];
      const activeMap = getActiveMap();
      const activeRouteIds = getWaveRouteIds(activeMap, waveRef.current);

      // Screen shake
      const shake = screenShakeRef.current;
      const isShaking = shake.duration > 0;
      if (isShaking) {
        shake.x = (Math.random() - 0.5) * shake.intensity;
        shake.y = (Math.random() - 0.5) * shake.intensity;
        shake.intensity *= 0.9;
        shake.duration--;
        ctx.save();
        ctx.translate(shake.x, shake.y);
      }

      drawSceneBackground(ctx, theme, frameCountRef.current, activeMap.decor);
      drawTrack(ctx, theme, frameCountRef.current, activeMap.routes, activeRouteIds);
      activeMap.gates.forEach((gate) => {
        drawGate(ctx, gate.x, gate.y, gate.isExit && livesRef.current < 40 ? "#ef4444" : gate.color, gate.label, gate.isExit);
      });

      // --- Draw Mines ---
      minesRef.current.forEach((mine) => {
        const pulse = Math.sin(frameCountRef.current * 0.15) * 0.3 + 0.7;
        drawMineSprite(ctx, mine.x, mine.y, 5.5, "#ef4444", pulse);
        ctx.beginPath();
        ctx.arc(mine.x, mine.y, mine.triggerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.12 * pulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // --- Draw Thrown Mines ---
      mineProjectilesRef.current.forEach((mp) => {
        const arcHeight = Math.sin(mp.progress * Math.PI) * 16;
        ctx.save();
        ctx.translate(mp.x, mp.y - arcHeight);
        ctx.rotate(mp.progress * Math.PI * 2);
        drawMineSprite(ctx, 0, 0, 6, mp.color, 1);
        ctx.restore();
      });

      // --- Draw Speed Trails (pink candy dust) ---
      speedTrailsRef.current.forEach((trail) => {
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, trail.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(244, 63, 94, ${0.08 * (trail.life / 120)})`;
        ctx.fill();
      });

      activeMap.obstacles.forEach((obs) => drawObstacleSprite(ctx, obs));

      // --- Draw Placed Tower Ranges (when selected) ---
      if (selectedPlacedTowerId) {
        const selectedTower = towersRef.current.find((t) => t.id === selectedPlacedTowerId);
        if (selectedTower) {
          ctx.beginPath();
          ctx.arc(selectedTower.x, selectedTower.y, getEffectiveTowerRange(selectedTower), 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
          ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 5]);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]); // reset
        }
      }

      // --- Draw Hovered Tower Range ---
      if (isMouseOnCanvas && !selectedShopTower) {
        const hoveredTower = towersRef.current.find(
          (t) => getDistance(mousePos.x, mousePos.y, t.x, t.y) < 26
        );
        if (hoveredTower && hoveredTower.id !== selectedPlacedTowerId) {
          ctx.beginPath();
          ctx.arc(hoveredTower.x, hoveredTower.y, getEffectiveTowerRange(hoveredTower), 0, Math.PI * 2);
          ctx.fillStyle = "rgba(6, 182, 212, 0.04)";
          ctx.strokeStyle = "rgba(6, 182, 212, 0.45)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]); // reset
        }
      }


      // --- Draw Support Tower Range Rings (always visible, light gold) ---
      towersRef.current.forEach((tower) => {
        if (isSupportTowerType(tower.type)) {
          ctx.beginPath();
          ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
          ctx.fillStyle = tower.type === "bankomat" ? "rgba(250, 204, 21, 0.025)" : "rgba(234, 179, 8, 0.02)";
          ctx.strokeStyle = tower.type === "bankomat" ? "rgba(250, 204, 21, 0.16)" : "rgba(234, 179, 8, 0.1)";
          ctx.lineWidth = 1;
          ctx.fill();
          ctx.stroke();

          // Coffee steam particles
          if (tower.type === "coffee" && Math.random() < 0.15) {
            particlesRef.current.push({
              x: tower.x + (Math.random() - 0.5) * 10,
              y: tower.y - 10,
              vx: (Math.random() - 0.5) * 0.3,
              vy: -Math.random() * 0.8 - 0.3,
              color: "rgba(255, 255, 255, 0.3)",
              size: Math.random() * 3 + 1,
              life: 40,
              maxLife: 40
            });
          }
        }
        if (tower.type === "gas") {
          ctx.beginPath();
          ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(34, 197, 94, 0.03)";
          ctx.fill();
        }
      });

      // --- Draw Towers ---
      towersRef.current.forEach((tower) => {
        let towerAngle = 0;
        if (!isSupportTowerType(tower.type) && tower.type !== "gas") {
          let nearestEnemy: ActiveEnemy | null = null;
          let nearestDist = Infinity;
          for (const enemy of enemiesRef.current) {
            if (enemy.hp <= 0) continue;
            const d = getDistance(tower.x, tower.y, enemy.x, enemy.y);
            if (d < nearestDist && d <= getEffectiveTowerRange(tower) * 1.5) {
              nearestDist = d;
              nearestEnemy = enemy;
            }
          }
          if (nearestEnemy) {
            towerAngle = Math.atan2(nearestEnemy.y - tower.y, nearestEnemy.x - tower.x);
          }
        }
        drawTowerSprite(ctx, tower, towerAngle, selectedPlacedTowerId === tower.id);

        // Support buff visual indicator
        if (tower.hasCoffeeBuff && !isSupportTowerType(tower.type)) {
          const pulse = Math.sin(frameCountRef.current * 0.08) * 0.3 + 0.7;
          const strength = tower.coffeeBuffStrength || 0.5;
          const glowRadius = 20 + strength * 4;

          // Golden glow ring
          ctx.beginPath();
          ctx.arc(tower.x, tower.y, glowRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(234, 179, 8, ${0.3 * pulse * strength})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Inner golden fill
          ctx.beginPath();
          ctx.arc(tower.x, tower.y, 18, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(234, 179, 8, ${0.06 * pulse * strength})`;
          ctx.fill();

          ctx.fillStyle = `rgba(250, 204, 21, ${0.78 * pulse})`;
          ctx.beginPath();
          ctx.moveTo(tower.x, tower.y - 31);
          ctx.lineTo(tower.x + 4, tower.y - 25);
          ctx.lineTo(tower.x, tower.y - 19);
          ctx.lineTo(tower.x - 4, tower.y - 25);
          ctx.closePath();
          ctx.fill();
        }

        // Camo buff indicator
        if (tower.hasCamoBuff && !tower.camoDetection) {
          ctx.strokeStyle = "rgba(125, 211, 252, 0.85)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(tower.x + 15, tower.y - 18, 6, 3.5, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "rgba(125, 211, 252, 0.85)";
          ctx.beginPath();
          ctx.arc(tower.x + 15, tower.y - 18, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // --- Draw Shop Hover or Drag Preview (on top of towers) ---
      const activePreviewType = draggedTowerTypeRef.current || selectedShopTowerRef.current;
      const previewPos = draggedTowerPosRef.current || (selectedShopTowerRef.current && isMouseOnCanvasRef.current ? mousePosRef.current : null);

      if (activePreviewType && previewPos && previewPos.x > 0 && previewPos.y > 0) {
        const config = TOWER_CONFIGS[activePreviewType];
        if (config) {
          const onPath = isPositionOnPath(previewPos.x, previewPos.y, 26);
          const onObstacle = activeMap.obstacles.some((obs) => getDistance(previewPos.x, previewPos.y, obs.x, obs.y) < obs.radius + 18);
          const overlap = towersRef.current.some((t) => getDistance(previewPos.x, previewPos.y, t.x, t.y) < 26);
          const outOfBounds = previewPos.x < 24 || previewPos.x > GAME_WIDTH - 24 || previewPos.y < 24 || previewPos.y > GAME_HEIGHT - 24;
          const invalid = onPath || onObstacle || overlap || outOfBounds;

          // Range circle preview (full range)
          ctx.beginPath();
          ctx.arc(previewPos.x, previewPos.y, config.range, 0, Math.PI * 2);
          ctx.fillStyle = invalid ? "rgba(239, 68, 68, 0.06)" : "rgba(34, 197, 94, 0.06)";
          ctx.strokeStyle = invalid ? "rgba(239, 68, 68, 0.35)" : "rgba(34, 197, 94, 0.35)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 6]);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);

          // Tower base preview
          ctx.beginPath();
          ctx.arc(previewPos.x, previewPos.y, 18, 0, Math.PI * 2);
          ctx.fillStyle = invalid ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)";
          ctx.strokeStyle = invalid ? "#ef4444" : "#22c55e";
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();

          drawTowerMini(ctx, previewPos.x, previewPos.y, activePreviewType, config.color, 0.86);

          // Tower name above
          ctx.font = "bold 10px Arial";
          ctx.fillStyle = invalid ? "#ef4444" : "#22c55e";
          ctx.fillText(config.name, previewPos.x, previewPos.y - 28);

          // Status text below
          if (invalid) {
            ctx.fillStyle = "#ef4444";
            ctx.font = "bold 9px Arial";
            let reason = "";
            if (onPath) reason = "На дорозі!";
            else if (onObstacle) reason = "Перешкода!";
            else if (overlap) reason = "Занадто близько!";
            else if (outOfBounds) reason = "За межами!";
            ctx.fillText(reason, previewPos.x, previewPos.y + 28);
          } else {
            ctx.fillStyle = "rgba(34, 197, 94, 0.7)";
            ctx.font = "9px Arial";
            ctx.fillText(`GOLD ${config.cost}`, previewPos.x, previewPos.y + 28);
          }
        }
      }

      // --- Draw Shop Hover Range Preview (when just hovering shop item) ---
      if (!activePreviewType && hoveredShopTowerRef.current && isMouseOnCanvasRef.current) {
        const hoverConfig = TOWER_CONFIGS[hoveredShopTowerRef.current];
        if (hoverConfig) {
          const pos = mousePosRef.current;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, hoverConfig.range, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(6, 182, 212, 0.05)";
          ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // --- Draw Enemies ---
      enemiesRef.current.forEach((enemy) => {
        // Draw glitched lag shadow if freezing/glitching
        if (enemy.freezeDuration > 0) {
          ctx.beginPath();
          ctx.arc(enemy.x + (getPureRandom() - 0.5) * 4, enemy.y + (getPureRandom() - 0.5) * 4, enemy.radius, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(168, 85, 247, 0.15)";
          ctx.fill();
        }

        drawEnemySprite(ctx, enemy, frameCountRef.current);

        // Tier indicator badge
        if (enemy.tier && enemy.tier > 1) {
          const tierColors = ["", "#94a3b8", "#22c55e", "#3b82f6", "#a855f7", "#f59e0b"];
          const tierColor = tierColors[enemy.tier] || "#ffffff";
          const bx = enemy.x + enemy.radius - 2;
          const by = enemy.y - enemy.radius + 2;
          ctx.fillStyle = tierColor;
          ctx.beginPath();
          ctx.arc(bx, by, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#000000";
          ctx.font = "bold 8px Arial";
          ctx.fillText(`${enemy.tier}`, bx, by);
        }

        // Healer aura (pulsing green ring)
        if (enemy.isHealer && enemy.hp > 0) {
          const healPulse = Math.sin(frameCountRef.current * 0.1) * 0.3 + 0.7;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, 30, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(74, 222, 128, ${0.25 * healPulse})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, 60, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(74, 222, 128, ${0.12 * healPulse})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Status effect overlays
        if (enemy.slowDuration > 0) {
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.radius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        if (enemy.freezeDuration > 0) {
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.radius + 2, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(147, 197, 253, 0.7)";
          ctx.lineWidth = 3;
          ctx.stroke();
          // Ice crystals
          for (let ci = 0; ci < 3; ci++) {
            const cAngle = frameCountRef.current * 0.05 + ci * (Math.PI * 2 / 3);
            const cx = enemy.x + Math.cos(cAngle) * (enemy.radius + 6);
            const cy = enemy.y + Math.sin(cAngle) * (enemy.radius + 6);
            ctx.fillStyle = "#93c5fd";
            ctx.fillRect(cx - 2, cy - 2, 4, 4);
          }
        }
        if (enemy.gasSlowDuration > 0) {
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.radius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(34, 197, 94, 0.4)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        if (enemy.isCamo) {
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }

        // Hit flash
        if (enemy.lastHitFrame && frameCountRef.current - enemy.lastHitFrame < 4) {
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.fill();
        }

        // Draw armor shield icon if armored
        if (enemy.isArmored || enemy.isSuperArmored) {
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.arc(enemy.x - enemy.radius + 3, enemy.y - enemy.radius + 3, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw bug icon if Copilot Bug active
        if (enemy.hasCopilotBug) {
          ctx.fillStyle = "#a855f7";
          ctx.beginPath();
          ctx.arc(enemy.x + enemy.radius - 3, enemy.y - enemy.radius + 3, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Health bar
        const barW = enemy.radius * 1.8;
        const barH = 4;
        const barX = enemy.x - barW / 2;
        const barY = enemy.y - enemy.radius - 8;

        // Background
        ctx.fillStyle = "#3f3f46";
        ctx.fillRect(barX, barY, barW, barH);

        // Fill ratio
        const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
        ctx.fillStyle = hpRatio > 0.5 ? "#22c55e" : hpRatio > 0.25 ? "#eab308" : "#ef4444";
        ctx.fillRect(barX, barY, barW * hpRatio, barH);

        // Shield bar
        if (enemy.shieldHp !== undefined && enemy.shieldHp > 0) {
          const shieldRatio = enemy.shieldHp / 80;
          ctx.fillStyle = "#1e3a5f";
          ctx.fillRect(barX, barY - 5, barW, 3);
          ctx.fillStyle = "#0ea5e9";
          ctx.fillRect(barX, barY - 5, barW * shieldRatio, 3);
        }
      });

      // --- Draw Projectile Trails ---
      projectileTrailRef.current.forEach((t) => {
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
        ctx.fillStyle = t.color;
        ctx.globalAlpha = t.alpha;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // --- Draw Projectiles ---
      projectilesRef.current.forEach((proj) => {
        drawProjectileSprite(ctx, proj);
      });

      // --- Draw Particles ---
      particlesRef.current.forEach((p) => {
        ctx.fillStyle = p.color;
        const opacity = p.life / p.maxLife;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        if (p.shape === "square") {
          ctx.rect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        } else {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.globalAlpha = 1.0; // reset
      });

      // --- Draw Explosion Rings ---
      explosionRingsRef.current.forEach((r) => {
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = r.life / 30;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      });

      // --- Draw Floating Text ---
      floatingTextsRef.current.forEach((ft) => {
        ctx.save();
        const opacity = ft.life / ft.maxLife;
        ctx.globalAlpha = opacity;
        ctx.fillStyle = ft.color;
        ctx.font = `bold ${ft.size || 11}px ${ft.font || "var(--font-body)"}`;
        ctx.textAlign = "center";
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // Wave announcement
      if (waveAnnouncementRef.current) {
        const wa = waveAnnouncementRef.current;
        const elapsed = frameCountRef.current - wa.frameStart;
        if (elapsed < 120) {
          const alpha = elapsed < 15 ? elapsed / 15 : elapsed > 90 ? 1 - (elapsed - 90) / 30 : 1;
          ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 36px var(--font-display)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`WAVE ${wa.wave}`, GAME_WIDTH / 2, GAME_HEIGHT / 2);
          ctx.globalAlpha = 1.0;
        } else {
          waveAnnouncementRef.current = null;
        }
      }

      // Restore screen shake
      if (isShaking) {
        ctx.restore();
      }

      // Vignette overlay
      const vignette = ctx.createRadialGradient(GAME_WIDTH/2, GAME_HEIGHT/2, GAME_WIDTH*0.3, GAME_WIDTH/2, GAME_HEIGHT/2, GAME_WIDTH*0.7);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    };

    // The core loop callback
    const gameLoop = () => {
      updateGame();
      renderGame();
      
      // Pull lives & gold into state on change to trigger React re-renders for UI
      if (towersRef.current.length >= 0) { // keep check cheap
        // sync back to react state if changed, using throttle
        if (getPureRandom() < 0.1) {
          // Sync state
        }
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShopTower, isMouseOnCanvas, selectedPlacedTowerId, isEndless]);

  // Periodic React state synchronization loop (run at slower rate to prevent React lag)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (gameStatus === "playing") {
        // Fetch current lives & gold from ref
        setLives(livesRef.current);
        setGold(goldRef.current);

        // Sync selected tower statistics (like kills)
        if (selectedPlacedTowerId) {
          const currentT = towersRef.current.find((t) => t.id === selectedPlacedTowerId);
          if (currentT) {
            setSelectedTower({ ...currentT });
          } else {
            setSelectedTower(null);
          }
        }
      }
    }, 150); // 6 times a second is plenty for responsive UI
    
    return () => clearInterval(syncInterval);
  }, [gameStatus, selectedPlacedTowerId]);

  // Reset helper
  const handleRestart = () => {
    setScoreSubmitted(false);
    setPlayerName("");
    startGame();
  };

  const handleEndless = () => {
    setIsEndless(true);
    gameStatusRef.current = "playing";
    setGameStatus("playing");
    waveRef.current = 47;
    setWave(47);
    isWaveActiveRef.current = false;
    setIsWaveActive(false);
    pushLog("Почалася нескінченна гра! Вороги стають сильнішими з кожною хвилею.");
  };

  const handleSubmitScore = async () => {
    const name = playerName.trim() || "Анонім";
    // Victory = current wave (e.g. 46), game over = waves survived (wave - 1)
    const finalWave = gameStatusRef.current === "victory" ? wave : wave - 1;
    // Always save locally
    addToLocalLeaderboard(name, score, finalWave);
    // Try to save globally (works if authenticated)
    const meta = {
      difficulty: difficultyRef.current,
      isEndless: isEndless,
      durationSeconds: sessionSummary?.durationSeconds ?? Math.max(0, Math.floor((frameCountRef.current - gameStartFrameRef.current) / 60)),
      version: GAME_VERSION,
      activeTitle: progressionRef.current.activeTitle,
      activeFrame: progressionRef.current.activeFrame,
      mapId: selectedMapIdRef.current,
    };
    await submitGlobalScore(name, score, finalWave, meta);
    // Reload merged leaderboard
    const local = getLocalLeaderboard();
    const global = await fetchGlobalLeaderboard(leaderboardKind);
    setLeaderboard(mergeLeaderboards(global, local));
    setScoreSubmitted(true);
  };

  const selectedPlacedTower = selectedTower;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* Achievement Toasts */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {achievementToasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-zinc-900/95 border border-cyan-500/40 rounded p-3 shadow-lg shadow-cyan-950/30 animate-slide-up min-w-[220px] max-w-[280px]"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🏆</span>
              <span className="text-xs font-bold text-cyan-300 micro-cap">Досягнення відкрито</span>
            </div>
            <p className="text-sm font-bold text-on-primary">{toast.name}</p>
            <p className="text-[11px] text-on-primary-mute leading-snug">{toast.description}</p>
            <p className="text-[10px] text-yellow-400 mt-1">{toast.reward}</p>
          </div>
        ))}
      </div>

      {/* LEFT: Game Scene Area */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        {/* Top Control Bar */}
        <div className="card-dark p-4 flex flex-wrap items-center justify-between gap-4 border-hairline-dark">
          {/* Status Display */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="micro-cap text-ink-mute">Нерви Кодла (HP)</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="rounded border border-red-900/70 bg-red-950/40 px-1.5 py-0.5 text-[10px] font-bold text-red-300">HP</span>
                <span className={`text-xl font-bold font-[var(--font-display)] ${lives <= 35 ? "text-red-500 animate-pulse" : "text-on-primary"}`}>
                  {lives}
                </span>
                <div className="w-24 h-2 bg-zinc-800 rounded overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-200 ${lives <= 35 ? "bg-red-500" : "bg-green-500"}`} 
                    style={{ width: `${lives}%` }} 
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="micro-cap text-ink-mute">Nescafe Gold (Валюта)</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="rounded border border-yellow-900/70 bg-yellow-950/40 px-1.5 py-0.5 text-[10px] font-bold text-yellow-300">GOLD</span>
                <span className="text-xl font-bold font-[var(--font-display)] text-yellow-500">
                  {gold}
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="micro-cap text-ink-mute">Score</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="rounded border border-purple-900/70 bg-purple-950/40 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">PTS</span>
                <span className="text-xl font-bold font-[var(--font-display)] text-purple-400">
                  {score}
                </span>
              </div>
            </div>

            <div className="flex flex-col min-w-[140px]">
              <span className="micro-cap text-ink-mute">Накат Братви (Хвиля)</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="rounded border border-cyan-900/70 bg-cyan-950/40 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">WAVE</span>
                <span className="text-xl font-bold font-[var(--font-display)] text-on-primary">
                  {wave} {isEndless && <span className="text-xs text-purple-400 font-normal">Endless</span>}
                </span>
              </div>
              {isWaveActive && (
                <div className="mt-1 w-full">
                  {(() => {
                    const remainingEnemies = enemiesRef.current.length + spawnQueueRef.current.filter((s) => s.type).length;
                    const remainingHp = enemiesRef.current.reduce((sum, e) => sum + e.hp, 0);
                    const enemyPct = waveTotalEnemiesRef.current > 0 ? Math.max(0, Math.min(100, (remainingEnemies / waveTotalEnemiesRef.current) * 100)) : 0;
                    const hpPct = waveTotalHpRef.current > 0 ? Math.max(0, Math.min(100, (remainingHp / waveTotalHpRef.current) * 100)) : 0;
                    return (
                      <div className="space-y-1">
                        <div className="w-28 h-1.5 bg-zinc-800 rounded overflow-hidden">
                          <div className="h-full bg-cyan-500 transition-all duration-150" style={{ width: `${100 - enemyPct}%` }} />
                        </div>
                        <div className="text-[10px] text-ink-mute font-mono">
                          {remainingEnemies}/{waveTotalEnemiesRef.current} • {Math.round(remainingHp / 1000)}к HP
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {(() => {
              const levelProgress = getPlayerLevelProgress(progression.totalXp);
              const pct = levelProgress.nextRequirement > 0 ? Math.min(100, (levelProgress.currentXp / levelProgress.nextRequirement) * 100) : 100;
              return (
                <div className="flex flex-col min-w-[150px]">
                  <span className="micro-cap text-ink-mute">Прогресія</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="rounded border border-cyan-900/70 bg-cyan-950/40 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">LVL</span>
                    <span className="text-xl font-bold font-[var(--font-display)] text-cyan-300">LVL {progression.playerLevel}</span>
                  </div>
                  <div className="mt-1 w-32 h-1.5 bg-zinc-800 rounded overflow-hidden">
                    <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {gameStatus === "playing" && (
              <>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="px-4 py-2 border border-hairline-dark rounded hover:bg-canvas-night-soft text-sm font-bold micro-cap"
                >
                  {isPaused ? "Продовжити" : "Пауза"}
                </button>
                <button
                  onClick={() => setGameSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 3 : 1))}
                  className="px-4 py-2 border border-hairline-dark rounded hover:bg-canvas-night-soft text-sm font-bold text-cyan-400 micro-cap"
                >
                  Швидкість: {gameSpeed}x
                </button>
                <button
                  onClick={() => setIsAutoStart(!isAutoStart)}
                  className={`px-4 py-2 border rounded text-sm font-bold micro-cap transition-all ${
                    isAutoStart 
                      ? "bg-cyan-950/50 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]" 
                      : "border-hairline-dark hover:bg-canvas-night-soft text-ink-mute"
                  }`}
                >
                  Авто-накат: {isAutoStart ? "УВМ" : "ВИМК"}
                </button>
                {!isWaveActive && (
                  <button
                    onClick={startNextWave}
                    className="px-6 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 text-sm font-bold button-cap"
                  >
                    Почати накат
                  </button>
                )}
              </>
            )}

            {gameStatus === "idle" && (
              <button
                onClick={startGame}
                className="px-6 py-3 bg-cyan-600 text-white rounded hover:bg-cyan-500 font-bold button-cap"
              >
                Почати гру
              </button>
            )}
          </div>
        </div>

        {/* Canvas Game Box */}
        <div className="relative border border-hairline-dark rounded overflow-hidden aspect-[8/5] w-full bg-black shadow-xl shadow-cyan-950/25">
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onTouchMove={handleCanvasTouchMove}
            onTouchEnd={handleCanvasTouchEnd}
            onMouseEnter={(e) => {
              isMouseOnCanvasRef.current = true;
              setIsMouseOnCanvas(true);
              updateCanvasPointer(e.clientX, e.clientY);
            }}
            onMouseLeave={() => {
              isMouseOnCanvasRef.current = false;
              setIsMouseOnCanvas(false);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!draggedTowerTypeRef.current) return;
              isMouseOnCanvasRef.current = true;
              setIsMouseOnCanvas(true);
              updateCanvasPointer(e.clientX, e.clientY);
            }}
            onDragLeave={() => {
              draggedTowerPosRef.current = null;
              setDraggedTowerPos(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (gameStatus !== "playing") return;
              const towerType = e.dataTransfer.getData("text/plain");
              if (!towerType || !TOWER_CONFIGS[towerType]) return;
              
              const point = updateCanvasPointer(e.clientX, e.clientY);
              if (!point) return;
              
              tryPlaceTower(towerType, point.x, point.y);
              draggedTowerTypeRef.current = null;
              draggedTowerPosRef.current = null;
              setDraggedTowerType(null);
              setDraggedTowerPos(null);
            }}
            className="w-full h-full cursor-crosshair block"
          />

          {/* Game Over Screen */}
          {gameStatus === "gameover" && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-slide-up overflow-y-auto">
              <h2 className="heading-hero text-red-500 mb-2">Кодло не вивезло</h2>
              <p className="text-on-primary-mute mb-4 max-w-md text-sm">
                Братва прорвала оборону Кодлохабу. Подро мовчав занадто довго. Спробуйте іншу тактику!
              </p>
              <p className="text-yellow-400 font-bold text-lg mb-4">
                Score: {score} | Хвиль: {wave - 1}
              </p>
              {sessionSummary && (
                <SessionSummaryPanel summary={sessionSummary} />
              )}
              {!scoreSubmitted ? (
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Ваше ім'я"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    className="px-3 py-2 bg-zinc-900 border border-hairline-dark rounded text-on-primary text-sm w-40"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmitScore()}
                  />
                  <button onClick={handleSubmitScore} className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-500 text-sm font-bold button-cap">
                    В лідерборд
                  </button>
                </div>
              ) : (
                <p className="text-green-400 text-sm mb-4">Збережено!</p>
              )}
              <LeaderboardPreview entries={leaderboard} />
              <button onClick={handleRestart} className="btn-ghost text-red-400 hover:text-white">
                Зіграти ще раз
              </button>
            </div>
          )}

          {/* Victory Screen */}
          {gameStatus === "victory" && (
            <div className="absolute inset-0 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-slide-up overflow-y-auto">
              <h2 className="heading-hero text-yellow-500 mb-2">ПОДРО ПОЧУВ</h2>
              <p className="text-on-primary-mute mb-4 max-w-md text-sm">
                Братва відбита! CodloHub survived another cringe incident. Ви можете грати нескінченно!
              </p>
              <p className="text-yellow-400 font-bold text-lg mb-4">
                Фінальний Score: {score}
              </p>
              {sessionSummary && (
                <SessionSummaryPanel summary={sessionSummary} />
              )}
              {!scoreSubmitted ? (
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Ваше ім'я"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    className="px-3 py-2 bg-zinc-900 border border-hairline-dark rounded text-on-primary text-sm w-40"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmitScore()}
                  />
                  <button onClick={handleSubmitScore} className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-500 text-sm font-bold button-cap">
                    В лідерборд
                  </button>
                </div>
              ) : (
                <p className="text-green-400 text-sm mb-4">Збережено!</p>
              )}
              <LeaderboardPreview entries={leaderboard} />
              <div className="flex gap-4">
                <button onClick={handleEndless} className="px-6 py-3 bg-yellow-600 text-white rounded hover:bg-yellow-500 button-cap">
                  Нескінченна гра
                </button>
                <button onClick={handleRestart} className="px-6 py-3 border border-hairline-dark rounded hover:bg-canvas-night-soft text-on-primary button-cap">
                  Почати знову
                </button>
              </div>
            </div>
          )}

          {/* Start Prompt Overlay */}
          {gameStatus === "idle" && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center">
              <h2 className="heading-section text-on-primary mb-4">BRAT TD</h2>
              <p className="text-on-primary-mute mb-6 max-w-md text-sm">
                Захистіть Кодлохаб від хвиль Братви. Ставте Подро-юнітів, які кидатимуть молотки,
                каву та святих рачків.
              </p>
              <div className="mb-4 grid w-full max-w-2xl gap-2 sm:grid-cols-3">
                {MAP_CONFIGS.map((map) => {
                  const completions = progression.mapCompletions[map.id] ?? [];
                  const isSelected = selectedMapId === map.id;
                  return (
                    <button
                      key={map.id}
                      onClick={() => setSelectedMapId(map.id)}
                      className={`rounded border p-3 text-left transition-colors ${isSelected ? "border-cyan-400 bg-cyan-950/40" : "border-hairline-dark bg-black/30 hover:border-on-primary-mute"}`}
                    >
                      <span className="block text-xs font-bold text-on-primary">{map.name}</span>
                      <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-cyan-300">{map.difficultyLabel}</span>
                      <span className="mt-1 block min-h-10 text-[10px] leading-tight text-ink-mute">{map.description}</span>
                      <span className="mt-2 flex flex-wrap gap-1">
                        {(Object.keys(DIFFICULTY_CONFIG) as DifficultyKey[]).map((key) => (
                          <span
                            key={key}
                            className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${completions.includes(key) ? "border-green-700 bg-green-950/50 text-green-300" : "border-hairline-dark bg-black/30 text-ink-mute"}`}
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
                {(Object.entries(DIFFICULTY_CONFIG) as [DifficultyKey, typeof DIFFICULTY_CONFIG[DifficultyKey]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setDifficulty(key)}
                    className={`p-2 rounded border text-left transition-colors ${difficulty === key ? "border-cyan-400 bg-cyan-950/40" : "border-hairline-dark bg-black/30 hover:border-on-primary-mute"}`}
                  >
                    <span className="block text-xs font-bold text-on-primary">{cfg.label}</span>
                    <span className="block text-[10px] text-ink-mute leading-tight">{cfg.description}</span>
                  </button>
                ))}
              </div>
              <div className="mb-5 max-w-md text-left bg-zinc-950/70 border border-hairline-dark rounded p-3 text-[11px] text-on-primary-mute leading-relaxed">
                <p className="micro-cap text-cyan-400 mb-1">ШВИДКИЙ ТУТОРІАЛ</p>
                <p>1-0: вибір башт. Q/W/E: апгрейди вибраної башти. Space: старт хвилі. Delete/X: продаж. P: пауза. ESC: скасувати.</p>
                <p>Свинець не любить газ/Infinix/Candy/бронебійне. Камо треба бачити. Після 46 є 10 handcrafted post-game хвиль.</p>
              </div>
              <button
                onClick={startGame}
                className="btn-ghost text-cyan-400 hover:text-white mb-6"
              >
                ПРИЙНЯТИ НАКАТ
              </button>
            </div>
          )}
        </div>

        {leaderboard.length > 0 && (
          <div className="card-dark p-3 border-hairline-dark">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="micro-cap text-ink-mute">ЛЕДЕРБОРД</p>
              <div className="flex gap-1">
                {LEADERBOARD_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setLeaderboardKind(tab.key)}
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
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-5">
              {leaderboard.slice(0, 10).map((e, i) => (
                <div key={`${e.name}-${e.score}-${i}`} className={`flex items-center justify-between gap-2 rounded border border-hairline-dark/70 bg-black/35 px-2 py-1.5 text-xs ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-on-primary-mute"}`}>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-5 shrink-0 text-right font-bold">{i + 1}.</span>
                    <span className="truncate">
                      {e.activeTitle && <span className="text-cyan-300 mr-1">[{e.activeTitle}]</span>}
                      {e.name}
                    </span>
                  </span>
                  <span className="shrink-0 font-bold">{leaderboardKind === "fastest_victory" ? formatSeconds(e.durationSeconds ?? 0) : e.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wave Preview */}
        {gameStatus === "playing" && !isWaveActive && (() => {
          const nextWaveNum = wave;
          if (nextWaveNum > 56) return null;
          const activeMap = getMapById(selectedMapId);
          const routeIds = getWaveRouteIds(activeMap, nextWaveNum);
          const nextSegments = getScaledWave(nextWaveNum);
          const counts: Record<string, number> = {};
          let totalHp = 0;
          const segmentStats = nextSegments.map((s) => getEnemyStatsForWave(s.type, nextWaveNum, s.modifiers));
          nextSegments.forEach((s) => {
            const stats = getEnemyStatsForWave(s.type, nextWaveNum, s.modifiers);
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
                <span className="micro-cap text-ink-mute">Наступна хвиля {nextWaveNum}:</span>
                <span className="text-ink-mute text-xs">{totalEnemies} ворогів • {Math.round(totalHp / 1000)}к HP</span>
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {routeIds.map((routeId) => (
                  <span key={routeId} className="rounded border border-cyan-900/70 bg-cyan-950/30 px-1.5 py-0.5 text-[10px] text-cyan-300">
                    {getRouteById(activeMap, routeId).name}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {types.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-black/40 border border-hairline-dark rounded text-xs" title={t}>
                    <span
                      className="h-2.5 w-2.5 rounded-sm border border-white/20"
                      style={{ backgroundColor: ENEMY_CONFIGS[t]?.color ?? "#94a3b8" }}
                    />
                    <span className="font-mono text-on-primary">{counts[t]}</span>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hasCamo && <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950/60 text-purple-300 border border-purple-800">CAMO</span>}
                {hasPhantom && <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950/60 text-indigo-300 border border-indigo-800">PHANTOM</span>}
                {hasLead && <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-800 text-gray-300 border border-gray-600">LEAD</span>}
                {hasArmor && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800">ARMOR</span>}
                {hasRegen && <span className="px-1.5 py-0.5 rounded text-[10px] bg-pink-950/60 text-pink-300 border border-pink-800">REGEN</span>}
                {hasHealer && <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-950/60 text-green-300 border border-green-800">HEALER</span>}
              </div>
            </div>
          );
        })()}

        {/* Message Ticker Log */}
        <div className="card-dark p-3 text-sm border-hairline-dark flex items-center gap-3 bg-canvas-night-soft text-cyan-400 font-mono">
          <span className="animate-pulse text-xs">●</span>
          <span>{statusMessage}</span>
        </div>
      </div>

      {/* RIGHT: Sidebar Shop & Upgrades */}
      <div className="flex flex-col gap-6">
        <div className="card-dark p-4 border-hairline-dark">
          {(() => {
            const levelProgress = getPlayerLevelProgress(progression.totalXp);
            const nextTower = Object.entries(TOWER_UNLOCK_LEVELS)
              .filter(([towerType, level]) => level > progression.playerLevel && TOWER_CONFIGS[towerType])
              .sort((a, b) => a[1] - b[1])[0];
            return (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="micro-cap text-ink-mute">ПРОГРЕСІЯ</p>
                  <span className="text-xs font-bold text-cyan-300">v{GAME_VERSION} · LVL {progression.playerLevel}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded overflow-hidden mb-2">
                  <div
                    className="h-full bg-cyan-400"
                    style={{ width: `${levelProgress.nextRequirement > 0 ? Math.min(100, (levelProgress.currentXp / levelProgress.nextRequirement) * 100) : 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-on-primary-mute mb-2">
                  XP: {Math.floor(levelProgress.currentXp)} / {levelProgress.nextRequirement || "MAX"}
                </p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {Object.entries(TOWER_CONFIGS).map(([towerType, cfg]) => (
                    <span
                      key={towerType}
                      className={`inline-flex h-6 w-6 items-center justify-center rounded border ${isTowerUnlocked(towerType, progression) ? "border-cyan-800 bg-cyan-950/30" : "border-hairline-dark bg-black/30 opacity-40"}`}
                      title={`${cfg.name}${isTowerUnlocked(towerType, progression) ? "" : ` · LVL ${TOWER_UNLOCK_LEVELS[towerType]}`}`}
                    >
                      <span className="h-3 w-3 rounded-sm border border-white/20" style={{ backgroundColor: cfg.color }} />
                    </span>
                  ))}
                </div>
                {nextTower && (
                  <p className="text-[11px] text-ink-mute">
                    Наступна вежа: {TOWER_CONFIGS[nextTower[0]].name} на LVL {nextTower[1]}
                  </p>
                )}
                <p className="text-[11px] text-yellow-400 mt-2">
                  Бонус старту: +{progression.bonusStartGold} GOLD / +{progression.bonusLives} HP
                </p>
                <p className="text-[11px] text-ink-mute mt-1">
                  Досягнення: {progression.achievements.length}/{ACHIEVEMENTS.length}
                </p>
              </>
            );
          })()}
        </div>

        {selectedPlacedTower ? (
          // Upgrades Panel (appears when a placed tower is selected, replacing shop)
          <div className="card-dark p-4 border-hairline-dark bg-canvas-night-soft animate-slide-up">
            <div className="flex items-center justify-between border-b border-hairline-dark pb-3 mb-3">
              <div>
                <h3 className="font-bold text-on-primary flex items-center gap-2 button-cap">
                  <span className="h-3 w-3 rounded-sm border border-white/20" style={{ backgroundColor: selectedPlacedTower.color }} />
                  {selectedPlacedTower.name}
                </h3>
                <p className="text-xs text-ink-mute mt-0.5">Рівень: {selectedPlacedTower.level} | Убивств: {selectedPlacedTower.totalKills}</p>
                <p className="text-[10px] text-cyan-300 mt-0.5">
                  Mastery XP: {Math.floor(progression.towerMastery[selectedPlacedTower.type]?.towerXp ?? 0)}
                </p>
                {!isSupportTowerType(selectedPlacedTower.type) && (
                  <>
                    {/* Targeting mode toggle */}
                    <div className="flex items-center gap-1 mt-1">
                      {(["first", "last", "strongest", "nearest"] as const).map((mode) => {
                        const labels: Record<string, string> = { first: "Перший", last: "Останній", strongest: "Найсильніший", nearest: "Найближчий" };
                        const isActive = (selectedPlacedTower.targetingMode || "first") === mode;
                        return (
                          <button
                            key={mode}
                            onClick={() => {
                              const t = towersRef.current.find((t) => t.id === selectedPlacedTower.id);
                              if (t) { t.targetingMode = mode; setSelectedTower({ ...t }); }
                            }}
                            className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                              isActive ? "border-cyan-500 text-cyan-400 bg-cyan-950/50" : "border-hairline-dark text-ink-mute hover:text-on-primary"
                            }`}
                          >
                            {labels[mode]}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={sellSelectedTower}
                  className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 rounded text-xs micro-cap transition-colors"
                >
                  Продати: +{Math.floor(
                    (TOWER_CONFIGS[selectedPlacedTower.type].cost +
                      ((): number => {
                        const baseConfig = TOWER_CONFIGS[selectedPlacedTower.type];
                        let upCost = 0;
                        for (let i = 0; i < selectedPlacedTower.path1Tier; i++) upCost += baseConfig.upgrades.path1[i].cost;
                        for (let i = 0; i < selectedPlacedTower.path2Tier; i++) upCost += baseConfig.upgrades.path2[i].cost;
                        for (let i = 0; i < selectedPlacedTower.path3Tier; i++) upCost += baseConfig.upgrades.path3[i].cost;
                        return upCost;
                      }                  )()) * ((selectedPlacedTower.path1Tier >= 5 || selectedPlacedTower.path2Tier >= 5 || selectedPlacedTower.path3Tier >= 5) ? 0.5 : 0.8)
                  )} ☕
                </button>
                <button
                  onClick={() => {
                    setSelectedPlacedTowerId(null);
                    setSelectedTower(null);
                  }}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-hairline-dark text-on-primary rounded text-xs font-semibold transition-colors"
                  title="Назад до магазину"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Detailed Stats Grid */}
            {(() => {
              if (isSupportTowerType(selectedPlacedTower.type)) {
                const speedBuff = selectedPlacedTower.buffMultiplier || (selectedPlacedTower.type === "coffee" ? 0.05 : 0);
                const rangeBuff = selectedPlacedTower.rangeBuff || 0;
                const rangeBuffPercent = selectedPlacedTower.rangeBuffPercent || 0;
                const armorPierce = selectedPlacedTower.ignoreArmorBuff || 0;
                return (
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-black/40 border border-hairline-dark/50 p-2.5 rounded mb-4">
                    <div>
                      <span className="text-ink-mute">Радіус аури:</span>{" "}
                      <span className="text-on-primary font-semibold">{Math.round(selectedPlacedTower.range)}px</span>
                    </div>
                    <div>
                      <span className="text-ink-mute">Дохід:</span>{" "}
                      <span className="text-yellow-400 font-semibold">+{selectedPlacedTower.endOfWaveBonus || 0} / хвиля</span>
                    </div>
                    <div>
                      <span className="text-ink-mute">Швидкість:</span>{" "}
                      <span className="text-cyan-400 font-semibold">+{Math.round(speedBuff * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-ink-mute">Шкода:</span>{" "}
                      <span className="text-green-400 font-semibold">+{formatStat(selectedPlacedTower.damageBuff || 0)}%</span>
                    </div>
                    <div>
                      <span className="text-ink-mute">Дальність веж:</span>{" "}
                      <span className="text-on-primary font-semibold">+{formatStat(rangeBuff)}px / +{Math.round(rangeBuffPercent * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-ink-mute">Пробиття броні:</span>{" "}
                      <span className="text-amber-300 font-semibold">{Math.round(armorPierce * 100)}%</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-ink-mute">Камуфляж аури:</span>{" "}
                      <span className={selectedPlacedTower.camoDetectionBuff ? "text-green-400 font-semibold animate-pulse" : "text-red-400 font-semibold"}>
                        {selectedPlacedTower.camoDetectionBuff ? "Дає вежам поруч" : "Ні"}
                      </span>
                    </div>
                    <div className="col-span-2 text-[10px] text-ink-mute border-t border-hairline-dark/50 pt-1">
                      Hotkeys: Q/W/E купують шлях 1/2/3. На мобілці вибір башти ставить паузу.
                    </div>
                  </div>
                );
              }

              const detectsCamo = selectedPlacedTower.camoDetection || selectedPlacedTower.hasCamoBuff;
              const isLeadImmune = selectedPlacedTower.ignoresArmor || selectedPlacedTower.type !== "hammer";
              const effectiveDamage = getEffectiveTowerDamage(selectedPlacedTower);
              const effectiveRange = getEffectiveTowerRange(selectedPlacedTower);
              const displayDamage = Math.round(effectiveDamage);
              const displayDamageBonus = Math.round(effectiveDamage - selectedPlacedTower.damage);
              const dps = getExpectedDps({ ...selectedPlacedTower, damage: effectiveDamage });
              return (
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-black/40 border border-hairline-dark/50 p-2.5 rounded mb-4">
                  <div>
                    <span className="text-ink-mute">Шкода:</span>{" "}
                    <span className="text-on-primary font-semibold">{displayDamage}</span>
                    {displayDamageBonus !== 0 && <span className="text-green-400"> (+{displayDamageBonus})</span>}
                  </div>
                  <div>
                    <span className="text-ink-mute">Дальність:</span>{" "}
                    <span className="text-on-primary font-semibold">{Math.round(effectiveRange)}px</span>
                  </div>
                  <div>
                    <span className="text-ink-mute">Пробиття (пірс):</span>{" "}
                    <span className="text-on-primary font-semibold">{selectedPlacedTower.pierce || 1}</span>
                  </div>
                  <div>
                    <span className="text-ink-mute">DPS:</span>{" "}
                    <span className="text-cyan-400 font-semibold">{dps.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-ink-mute">Камуфляж:</span>{" "}
                    <span className={detectsCamo ? "text-green-400 font-semibold animate-pulse" : "text-red-400 font-semibold"}>
                      {detectsCamo ? "Виявляє" : "Ні"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-ink-mute">Свинець:</span>{" "}
                    <span className={isLeadImmune ? "text-green-400 font-semibold" : "text-amber-500 font-semibold"}>
                      {isLeadImmune ? "Пробиває свинцеві" : "Не пробиває"}
                    </span>
                  </div>
                  <div className="col-span-2 text-[10px] text-ink-mute border-t border-hairline-dark/50 pt-1">
                    Hotkeys: Q/W/E купують шлях 1/2/3. На мобілці вибір башти ставить паузу.
                  </div>
                </div>
              );
            })()}

            <p className="micro-cap text-ink-mute mb-2">ПРОКАЧКА ЮНІТА</p>
            <div className="flex flex-col gap-4">
              {[0, 1, 2].map((pathIndex) => {
                const baseConfig = TOWER_CONFIGS[selectedPlacedTower.type];
                let pathName = "";
                let currentTier = 0;
                let pathUpgrades: Upgrade[] = [];
                
                if (pathIndex === 0) {
                  pathName = selectedPlacedTower.type === "bankomat" ? "Шлях 1: Економіка" : "Шлях 1: Руйнівна Сила";
                  currentTier = selectedPlacedTower.path1Tier;
                  pathUpgrades = baseConfig.upgrades.path1;
                } else if (pathIndex === 1) {
                  pathName = selectedPlacedTower.type === "bankomat" ? "Шлях 2: Підсилення" : "Шлях 2: Швидкість Атаки";
                  currentTier = selectedPlacedTower.path2Tier;
                  pathUpgrades = baseConfig.upgrades.path2;
                } else {
                  pathName = selectedPlacedTower.type === "bankomat" ? "Шлях 3: Радар і MIB" : "Шлях 3: Особливі Ефекти";
                  currentTier = selectedPlacedTower.path3Tier;
                  pathUpgrades = baseConfig.upgrades.path3;
                }

                // Check if allowed under BTD6 rules
                const isLocked = !checkUpgradeAllowed(
                  selectedPlacedTower.path1Tier,
                  selectedPlacedTower.path2Tier,
                  selectedPlacedTower.path3Tier,
                  pathIndex
                );

                const nextUpgrade = currentTier < 5 ? pathUpgrades[currentTier] : null;
                const canAfford = nextUpgrade ? gold >= nextUpgrade.cost : false;
                const nextTier = currentTier + 1;
                const tierUnlocked = nextUpgrade ? isTierUnlocked(selectedPlacedTower.type, pathIndex, nextTier, progression) : true;
                const unlockCost = TIER_UNLOCK_COSTS[nextTier];
                const masteryXp = progression.towerMastery[selectedPlacedTower.type]?.towerXp ?? 0;
                const canUnlockTier = Boolean(unlockCost && masteryXp >= unlockCost && (nextTier !== 5 || progression.playerLevel >= 25));
                const t5PathTaken = false;

                return (
                  <div key={pathIndex} className="border border-hairline-dark/60 rounded p-2.5 bg-canvas-night bg-opacity-40">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-on-primary-mute uppercase tracking-wider micro-cap">
                        {pathName}
                      </span>
                      {/* Dots indicator for purchased tiers */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((tier) => (
                          <div
                            key={tier}
                            className={`w-2 h-2 rounded-full border ${
                              tier <= currentTier
                                ? "bg-cyan-500 border-cyan-400 shadow shadow-cyan-500"
                                : "bg-black/40 border-hairline-dark"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {nextUpgrade ? (
                      isLocked ? (
                        <div className="p-2 border border-dashed border-red-950/50 bg-red-950/10 text-red-400 rounded text-center text-xs micro-cap">
                          ЗАБЛОКОВАНО CROSSPATH
                        </div>
                      ) : !tierUnlocked ? (
                        <button
                          disabled={!canUnlockTier}
                          onClick={() => unlockTierForTower(selectedPlacedTower.type, pathIndex, nextTier)}
                          className={`w-full p-2.5 border rounded text-left transition-all ${
                            canUnlockTier
                              ? "border-cyan-700 bg-cyan-950/20 hover:border-cyan-400"
                              : "border-hairline-dark/40 opacity-60 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-xs text-cyan-200">Відкрити T{nextTier}</span>
                            <span className="text-xs font-semibold text-cyan-400">XP {unlockCost}</span>
                          </div>
                          <p className="text-[11px] text-on-primary-mute leading-relaxed">
                            {nextTier === 5 && progression.playerLevel < 25
                              ? "Потрібен рівень гравця 25."
                              : `Потрібно XP цієї вежі. Є ${Math.floor(masteryXp)}.`}
                          </p>
                        </button>
                      ) : t5PathTaken ? (
                        <div className="p-2 border border-dashed border-yellow-950/70 bg-yellow-950/10 text-yellow-300 rounded text-center text-xs micro-cap">
                          T5 цього шляху вже стоїть
                        </div>
                      ) : (
                        <button
                          disabled={!canAfford || gameStatus !== "playing"}
                          onClick={() => buyUpgrade(pathIndex)}
                          className={`w-full p-2.5 border rounded text-left transition-all ${
                            canAfford
                              ? "border-hairline-dark hover:border-on-primary-mute hover:bg-canvas-night hover:bg-opacity-80"
                              : "border-hairline-dark/40 opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-xs text-on-primary">
                              {nextUpgrade.name} (T{currentTier + 1})
                            </span>
                            <span className="text-xs font-semibold text-yellow-500 font-[var(--font-display)]">
                              ☕ {nextUpgrade.cost}
                            </span>
                          </div>
                          <p className="text-[11px] text-on-primary-mute leading-relaxed">{nextUpgrade.description}</p>
                          <p className="mt-1 text-[10px] text-cyan-300/80 leading-tight">{getUpgradePreview(selectedPlacedTower, nextUpgrade)}</p>
                        </button>
                      )
                    ) : (
                      <div className="p-2 border border-green-950/40 bg-green-950/10 text-green-400 rounded text-center text-xs micro-cap">
                        МАКСИМУМ (Tier 5)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Tower Shop (visible by default)
          <div className="card-dark p-4 border-hairline-dark">
            <p className="micro-cap text-ink-mute mb-3">МАГАЗИН ПОДРО-ЮНІТІВ</p>
            <div className="flex flex-col gap-1.5">
              {Object.entries(TOWER_CONFIGS).map(([type, config]) => {
                const canAfford = gold >= config.cost;
                const towerUnlocked = isTowerUnlocked(type, progression);
                const neededLevel = TOWER_UNLOCK_LEVELS[type] ?? 1;
                const isSelected = selectedShopTower === type;
                return (
                  <div key={type} className="relative group">
                    <button
                      disabled={gameStatus !== "playing" || !towerUnlocked}
                      draggable={gameStatus === "playing" && canAfford && towerUnlocked}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", type);
                        e.dataTransfer.effectAllowed = "copy";
                        draggedTowerTypeRef.current = type;
                        selectedShopTowerRef.current = null;
                        setDraggedTowerType(type);
                        setSelectedShopTower(null);
                        setSelectedPlacedTowerId(null);
                        setSelectedTower(null);
                      }}
                      onDragEnd={() => {
                        draggedTowerTypeRef.current = null;
                        draggedTowerPosRef.current = null;
                        setDraggedTowerType(null);
                        setDraggedTowerPos(null);
                      }}
                      onMouseEnter={() => { hoveredShopTowerRef.current = type; }}
                      onMouseLeave={() => { hoveredShopTowerRef.current = null; }}
                      onClick={() => {
                        if (!towerUnlocked) {
                          pushLog(`${config.name} відкривається на рівні ${neededLevel}.`);
                          return;
                        }
                        const nextSelected = isSelected ? null : type;
                        selectedShopTowerRef.current = nextSelected;
                        draggedTowerTypeRef.current = null;
                        draggedTowerPosRef.current = null;
                        setSelectedShopTower(nextSelected);
                        setDraggedTowerType(null);
                        setDraggedTowerPos(null);
                        setSelectedPlacedTowerId(null);
                        setSelectedTower(null);
                      }}
                      className={`w-full px-3 py-2 border rounded text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? "border-white bg-zinc-900 shadow-md shadow-white/5 cursor-grab"
                          : canAfford && towerUnlocked
                          ? "border-hairline-dark hover:border-on-primary-mute hover:bg-canvas-night-soft cursor-grab"
                          : "border-hairline-dark/40 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <span className="h-3.5 w-3.5 rounded-sm border border-white/20" style={{ backgroundColor: config.color }} />
                        <span className="font-semibold text-on-primary">{config.name}</span>
                      </span>
                      <span className="text-xs font-bold font-[var(--font-display)] text-yellow-500">
                        {towerUnlocked ? `GOLD ${config.cost}` : `LVL ${neededLevel}`}
                      </span>
                    </button>
                    {/* Tooltip on hover */}
                    <div className="absolute z-50 left-0 right-0 bottom-full mb-1 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <div className="bg-zinc-900 border border-hairline-dark rounded p-3 shadow-xl text-xs">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="h-3.5 w-3.5 rounded-sm border border-white/20" style={{ backgroundColor: config.color }} />
                          <span className="font-bold text-on-primary text-sm">{config.name}</span>
                          <span className="text-yellow-500 font-bold">GOLD {config.cost}</span>
                        </div>
                        <p className="text-on-primary-mute mb-2 leading-relaxed">{config.description}</p>
                        <div className="grid grid-cols-2 gap-1 text-[11px]">
                          {config.damage > 0 && (
                            <div><span className="text-ink-mute">Шкода:</span> <span className="text-on-primary font-semibold">{config.damage}</span></div>
                          )}
                          {config.fireRate > 0 && (
                            <div><span className="text-ink-mute">Швидкість:</span> <span className="text-on-primary font-semibold">{config.fireRate}с</span></div>
                          )}
                          <div><span className="text-ink-mute">Дальність:</span> <span className="text-on-primary font-semibold">{config.range}px</span></div>
                          {config.pierce && config.pierce > 1 && (
                            <div><span className="text-ink-mute">Пірс:</span> <span className="text-on-primary font-semibold">{config.pierce}</span></div>
                          )}
                          {config.camoDetection && (
                            <div className="col-span-2"><span className="text-green-400">Виявляє камуфляж</span></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 p-2 border border-hairline-dark border-dashed rounded text-center text-ink-mute text-[11px] bg-black/20">
              Наведіть для інфо · Клік для вибору · Drag-and-drop для будівництва
            </div>
          </div>
        )}

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
                    <span className="font-bold text-on-primary">{unlocked ? "🏆" : "🔒"} {achievement.name}</span>
                    <span className={`shrink-0 text-[10px] micro-cap ${unlocked ? "text-cyan-300" : "text-ink-mute"}`}>
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

        {(progression.unlockedTitles.length > 0 || progression.unlockedFrames.length > 0 || progression.unlockedEffects.length > 0) && (
          <div className="card-dark p-4 border-hairline-dark">
            <p className="micro-cap text-ink-mute mb-3">КОСМЕТИКА</p>
            <div className="space-y-3">
              {progression.unlockedTitles.length > 0 && (
                <div>
                  <p className="text-[11px] text-ink-mute mb-1">Титул</p>
                  <select
                    className="w-full px-2 py-1.5 bg-black/40 border border-hairline-dark rounded text-xs text-on-primary"
                    value={progression.activeTitle ?? ""}
                    onChange={(e) => setProgression((prev) => normalizeProgression({ ...prev, activeTitle: e.target.value || null }))}
                  >
                    <option value="">— немає —</option>
                    {progression.unlockedTitles.map((title) => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                  </select>
                </div>
              )}
              {progression.unlockedFrames.length > 0 && (
                <div>
                  <p className="text-[11px] text-ink-mute mb-1">Рамка</p>
                  <select
                    className="w-full px-2 py-1.5 bg-black/40 border border-hairline-dark rounded text-xs text-on-primary"
                    value={progression.activeFrame ?? ""}
                    onChange={(e) => setProgression((prev) => normalizeProgression({ ...prev, activeFrame: e.target.value || null }))}
                  >
                    <option value="">— немає —</option>
                    {progression.unlockedFrames.map((frame) => (
                      <option key={frame} value={frame}>{frame}</option>
                    ))}
                  </select>
                </div>
              )}
              {progression.unlockedEffects.length > 0 && (
                <div>
                  <p className="text-[11px] text-ink-mute mb-1">Ефект</p>
                  <select
                    className="w-full px-2 py-1.5 bg-black/40 border border-hairline-dark rounded text-xs text-on-primary"
                    value={progression.activeEffect ?? ""}
                    onChange={(e) => setProgression((prev) => normalizeProgression({ ...prev, activeEffect: e.target.value || null }))}
                  >
                    <option value="">— немає —</option>
                    {progression.unlockedEffects.map((effect) => (
                      <option key={effect} value={effect}>{effect}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="card-dark p-4 border-hairline-dark">
          <p className="micro-cap text-ink-mute mb-3">НАЛАШТУВАННЯ</p>
          <label className="block text-xs text-on-primary-mute mb-3">
            Гучність: {Math.round(settings.volume * 100)}%
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              onChange={(e) => setSettings((prev) => ({ ...prev, volume: Number(e.target.value) }))}
              className="w-full mt-1"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-on-primary-mute mb-2">
            <input
              type="checkbox"
              checked={settings.screenShake}
              onChange={(e) => setSettings((prev) => ({ ...prev, screenShake: e.target.checked }))}
            />
            Screen shake
          </label>
          <label className="flex items-center gap-2 text-xs text-on-primary-mute">
            <input
              type="checkbox"
              checked={settings.particles}
              onChange={(e) => setSettings((prev) => ({ ...prev, particles: e.target.checked }))}
            />
            Частинки / вибухи
          </label>
        </div>
      </div>
    </div>
  );
}
