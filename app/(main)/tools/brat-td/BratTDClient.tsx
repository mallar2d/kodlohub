"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PATH,
  TOWER_CONFIGS,
  getScaledWave,
  getEnemyStatsForWave,
  TIER_SCALING,
  GAME_WIDTH,
  GAME_HEIGHT,
  PathPoint,
  Upgrade,
  UpgradeStats,
  OBSTACLES,
  EMOJI_MAP,
  SOUND_MAP,
  getWaveQuote
} from "./gameConfig";
import type { EnemyModifier } from "./gameConfig";

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
  "tackCount", "maxMines", "mineExplodes"
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
  lastHitFrame?: number;
  tier?: number;
  damageReduce?: number;
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
}

type DifficultyKey = "easy" | "normal" | "hard";

const DIFFICULTY_CONFIG: Record<DifficultyKey, { label: string; description: string; lives: number; gold: number; hpMult: number; speedMult: number; rewardMult: number }> = {
  easy: { label: "Легко", description: "+ресурси, м'якша братва", lives: 125, gold: 450, hpMult: 0.85, speedMult: 0.95, rewardMult: 1.1 },
  normal: { label: "Нормально", description: "чесний Коростишів", lives: 100, gold: 350, hpMult: 1, speedMult: 1, rewardMult: 1 },
  hard: { label: "Пекло", description: "братва без гальм", lives: 75, gold: 300, hpMult: 1.18, speedMult: 1.08, rewardMult: 0.92 }
};

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
const SUPPORT_TOWER_TYPES = new Set(["coffee", "bankomat"]);
const isSupportTowerType = (type: string) => SUPPORT_TOWER_TYPES.has(type);

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
  entries.push({ name, score, wave, date: new Date().toISOString().split("T")[0] });
  entries.sort((a, b) => b.score - a.score);
  const top10 = entries.slice(0, 10);
  saveLocalLeaderboard(top10);
  return top10;
}

async function fetchGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch("/api/brat-td");
    if (!res.ok) return [];
    const data = await res.json();
    return (data.leaderboard ?? []).map((e: { player_name: string; score: number; wave: number; created_at: string }) => ({
      name: e.player_name,
      score: e.score,
      wave: e.wave,
      date: e.created_at?.split("T")[0] ?? "",
      isGlobal: true,
    }));
  } catch {
    return [];
  }
}

async function submitGlobalScore(playerName: string, score: number, wave: number): Promise<boolean> {
  try {
    const res = await fetch("/api/brat-td", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName, score, wave }),
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
  const [playerName, setPlayerName] = useState("");
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  const selectedShopTowerRef = useRef<string | null>(null);
  const hoveredShopTowerRef = useRef<string | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isMouseOnCanvasRef = useRef(false);
  const draggedTowerTypeRef = useRef<string | null>(null);
  const draggedTowerPosRef = useRef<{ x: number; y: number } | null>(null);
  const difficultyRef = useRef<DifficultyKey>("normal");
  const settingsRef = useRef(DEFAULT_SETTINGS);

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
  const spawnQueueRef = useRef<{ type: string; delay: number; modifiers?: EnemyModifier[] }[]>([]);
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
  useEffect(() => { settingsRef.current = settings; saveSettings(settings); }, [settings]);

  // Load leaderboard on mount (API + localStorage merge)
  useEffect(() => {
    const load = async () => {
      const local = getLocalLeaderboard();
      const global = await fetchGlobalLeaderboard();
      setLeaderboard(mergeLeaderboards(global, local));
    };
    load();
  }, []);

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
    for (let i = 0; i < PATH.length - 1; i++) {
      const dist = getDistanceToSegment({ x, y }, PATH[i], PATH[i + 1]);
      if (dist < radius) return true;
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
  const spawnEnemyCallback = (type: string, x: number, y: number, modifiers?: EnemyModifier[]) => {
    const baseConfig = getEnemyStatsForWave(type, waveRef.current, modifiers);
    // Find closest pathIndex for spawned minion
    let closestIndex = 0;
    let minDist = Infinity;
    for (let i = 0; i < PATH.length; i++) {
      const dist = getDistance(x, y, PATH[i].x, PATH[i].y);
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
      shieldHp: baseConfig.shieldHp,
      tier: baseConfig.tier,
      damageReduce: baseConfig.tier ? TIER_SCALING[baseConfig.tier - 1]?.damageReduce ?? 0 : 0
    };
    enemiesRef.current.push(applyDifficultyToEnemy(newEnemy));
  };

  // --- GAME INITIALIZATION & CONTROL ---
  const startGame = () => {
    const selectedDifficulty = DIFFICULTY_CONFIG[difficultyRef.current];
    towersRef.current = [];
    enemiesRef.current = [];
    projectilesRef.current = [];
    mineProjectilesRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    speedTrailsRef.current = [];
    minesRef.current = [];
    setLives(selectedDifficulty.lives);
    livesRef.current = selectedDifficulty.lives;
    setGold(selectedDifficulty.gold);
    goldRef.current = selectedDifficulty.gold;
    setWave(1);
    waveRef.current = 1;
    setIsWaveActive(false);
    isWaveActiveRef.current = false;
    setGameStatus("playing");
    gameStatusRef.current = "playing";
    setIsPaused(false);
    setIsEndless(false);
    setScore(0);
    setSelectedShopTower(null);
    setSelectedPlacedTowerId(null);
    setSelectedTower(null);
    pushLog(`Складність: ${selectedDifficulty.label}. Подро почув накати братви. Поставте першого юніта!`);
  };

  const startNextWave = () => {
    if (isWaveActiveRef.current || gameStatusRef.current !== "playing") return;

    const segments = getScaledWave(waveRef.current);
    
    // Build spawn queue
    const queue: { type: string; delay: number; modifiers?: EnemyModifier[] }[] = [];
    segments.forEach((seg) => {
      for (let i = 0; i < seg.count; i++) {
        queue.push({
          type: seg.type,
          delay: seg.spawnDelay,
          modifiers: seg.modifiers
        });
      }
      if (seg.delayBeforeNext) {
        // insert empty delay
        queue.push({ type: "", delay: seg.delayBeforeNext });
      }
    });

    spawnQueueRef.current = queue;
    spawnTimerRef.current = 0;
    const totalEnemies = segments.reduce((sum, s) => sum + s.count, 0);
    waveTotalEnemiesRef.current = totalEnemies;
    waveTotalHpRef.current = segments.reduce((sum, s) => sum + getEnemyStatsForWave(s.type, waveRef.current, s.modifiers).hp * s.count, 0);
    setIsWaveActive(true);
    isWaveActiveRef.current = true;
    waveAnnouncementRef.current = { wave: waveRef.current, frameStart: frameCountRef.current };
    playTowerSound("wave");

    pushLog(getWaveQuote(waveRef.current));

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
    const onObstacle = OBSTACLES.some((obs) => getDistance(x, y, obs.x, obs.y) < obs.radius + 18);
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

    const sellPrice = Math.floor(totalCost * 0.8);
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
      pierce: tower.pierce
    });

    // Deduct cost and apply variables
    setGold((prev) => prev - upgrade.cost);
    tower.upgradesBought.push(upgrade.id);
    
    if (pathIndex === 0) tower.path1Tier++;
    else if (pathIndex === 1) tower.path2Tier++;
    else if (pathIndex === 2) tower.path3Tier++;

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
                const newEnemy: ActiveEnemy = {
                  id: getPureId(),
                  type: nextSpawn.type,
                  x: PATH[0].x,
                  y: PATH[0].y,
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
                  damageReduce: baseConfig.tier ? TIER_SCALING[baseConfig.tier - 1]?.damageReduce ?? 0 : 0
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

            pushLog(finalBonus > 0
              ? `Накат братви відбито! +${finalBonus} ☕ (${clearBonus ? `хвиля ${clearBonus}` : ""}${clearBonus && bonusGold ? " + " : ""}${bonusGold ? `економіка ${bonusGold}` : ""}).`
              : "Накат братви відбито!");
            
            // Check victory conditions (after wave 46)
            if (clearedWave === 46 && !isEndless) {
              gameStatusRef.current = "victory";
              setGameStatus("victory");
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
            if (enemy.slowDuration > 0) {
              currentSpeed *= (1 - (enemy.candySlowFactor || 0.5));
            }
            if (enemy.gasSlowDuration > 0) {
              currentSpeed *= (1 - (enemy.gasSlowFactor || 0.15));
            }
            if (standingOnTrail) {
              currentSpeed *= 1.4; // 40% speed boost
            }
            currentSpeed = Math.max(currentSpeed, enemy.speed * 0.15); // soft cap: slows cannot go below 15% speed
          }

          // Move enemy along path segments
          if (currentSpeed > 0) {
            const target = PATH[enemy.pathIndex];
            const dx = target.x - enemy.x;
            const dy = target.y - enemy.y;
            const dist = getDistance(enemy.x, enemy.y, target.x, target.y);

            if (dist <= currentSpeed) {
              // Snap to checkpoint
              enemy.x = target.x;
              enemy.y = target.y;
              enemy.pathIndex++;

              if (enemy.pathIndex >= PATH.length) {
                // Reached the end: player loses lives
                setLives((prev) => {
                  const newLives = Math.max(0, prev - enemy.damage);
                  if (newLives <= 0) {
                    gameStatusRef.current = "gameover";
                    setGameStatus("gameover");
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
                if (mine.slowAmount) target.gasSlowDuration = 60;
                if (mine.freezeChance && getPureRandom() < mine.freezeChance) target.freezeDuration = mine.freezeDuration || 60;
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
              while (warpRemaining > 0 && enemy.pathIndex < PATH.length) {
                const target = PATH[enemy.pathIndex];
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
              const maxMines = tower.maxMines ?? 15;
              const placedMines = minesRef.current.filter(m => m.towerId === tower.id).length;
              const flyingMines = mineProjectilesRef.current.filter(p => p.towerId === tower.id).length;
              if (placedMines + flyingMines < maxMines) {
                // Pick a random path point near the tower
                let bestX = tower.x, bestY = tower.y;
                let found = false;
                for (let pi = 0; pi < PATH.length - 1; pi++) {
                  const a = PATH[pi], b = PATH[pi + 1];
                  // Sample points along segment
                  for (let t = 0; t <= 1; t += 0.2) {
                    const px = a.x + (b.x - a.x) * t;
                    const py = a.y + (b.y - a.y) * t;
                    if (getDistance(tower.x, tower.y, px, py) <= effectiveRange) {
                      // Check no mine (placed or already thrown) is already here
                      const tooClose = minesRef.current.some(m => getDistance(m.x, m.y, px, py) < 30) ||
                        mineProjectilesRef.current.some(p => getDistance(p.targetX, p.targetY, px, py) < 30);
                      if (!tooClose) {
                        bestX = px + (getPureRandom() - 0.5) * 10;
                        bestY = py + (getPureRandom() - 0.5) * 10;
                        found = true;
                        break;
                      }
                    }
                  }
                  if (found) break;
                }

                if (found) {
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

                // Double-shot logic
                if (tower.alwaysDouble || tower.twoHits) {
                  const shotCount = tower.shotCount || 0;
                  if (tower.twoHits) tower.shotCount = shotCount + 1;
                  if (tower.alwaysDouble || (shotCount + 1) % 3 === 0) {
                    const offsetProj = {
                      ...newProj,
                      id: projId + "_2",
                      angle: angle + 0.25,
                      spinRotation: angle + 0.25,
                      x: tower.x + Math.cos(angle + Math.PI/2) * 8,
                      y: tower.y + Math.sin(angle + Math.PI/2) * 8
                    };
                    projectilesRef.current.push(offsetProj);
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
                spinRotation: angle
              };

              // Double-shot logic used by Hammer, Sniper and Monolith upgrades.
              if (tower.alwaysDouble || tower.twoHits) {
                const shotCount = tower.shotCount || 0;
                if (tower.twoHits) tower.shotCount = shotCount + 1;
                if (tower.alwaysDouble || (shotCount + 1) % 3 === 0) {
                  const offsetProj = {
                    ...newProj,
                    id: projId + "_2",
                    angle: angle + 0.25,
                    spinRotation: angle + 0.25,
                    x: tower.x + Math.cos(angle + Math.PI/2) * 8,
                    y: tower.y + Math.sin(angle + Math.PI/2) * 8
                  };
                  projectilesRef.current.push(offsetProj);
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
                radius: 50 + (sourceTower.explodeDmg || 0),
                triggerRadius: 15,
                ignoresArmor: sourceTower.ignoresArmor,
                armorPierce: sourceTower.coffeeIgnoreArmorBuff,
                slowAmount: sourceTower.slowAmount,
                freezeChance: sourceTower.freezeChance,
                freezeDuration: sourceTower.freezeDurationBonus,
                disableAbilities: sourceTower.disableAbilities,
                damageDebuff: sourceTower.damageDebuff ? 1.25 : undefined,
                pierce: sourceTower.pierce || 3,
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
            if (colDist <= enemy.radius + 8 && !proj.hitEnemyIds.includes(enemy.id)) {
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
                dmg = proj.gachaDamageOverride || 300;
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
                enemy.slowDuration = 120 + (proj.slowDurationBonus || 0);
                enemy.candySlowFactor = Math.min(0.85, 0.5 + (proj.slowFactorBonus || 0));
                
                if (proj.damageDebuff) {
                  enemy.damageDebuff = applyDamageDebuffCap(enemy.damageDebuff, proj.damageDebuff);
                }

                if (proj.isAoESlow) {
                  const candyRadius = proj.explodeDmg && proj.explodeDmg >= 80 ? 150 : proj.explodeDmg ? 100 : 60;
                  // slow nearby enemies and apply promised explosion damage
                  enemiesRef.current.forEach((other) => {
                    if (getDistance(enemy.x, enemy.y, other.x, other.y) <= candyRadius) {
                      other.slowDuration = 90 + (proj.slowDurationBonus || 0);
                      other.candySlowFactor = Math.min(0.85, 0.5 + (proj.slowFactorBonus || 0));
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
                if (proj.freezeChance && getPureRandom() < proj.freezeChance) {
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
                if (proj.freezeChance && getPureRandom() < proj.freezeChance) {
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
              enemy.onDeath(enemy.x, enemy.y, spawnEnemyCallback);
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

      // Map theme based on wave
      const themes = [
        { bg: "#000000", grid: "rgba(58, 58, 63, 0.2)", accent: "#06b6d4" }, // Night (default)
        { bg: "#0a0a1a", grid: "rgba(58, 58, 80, 0.25)", accent: "#818cf8" }, // Twilight
        { bg: "#0f0a00", grid: "rgba(80, 58, 30, 0.25)", accent: "#f59e0b" }, // Sunset
        { bg: "#0a000a", grid: "rgba(80, 30, 58, 0.25)", accent: "#ec4899" }, // Neon
        { bg: "#001a0a", grid: "rgba(30, 80, 58, 0.25)", accent: "#22c55e" }, // Toxic
      ];
      const themeIdx = Math.floor((waveRef.current - 1) / 10) % themes.length;
      const theme = themes[themeIdx];

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

      // Clear screen
      ctx.fillStyle = theme.bg; // SpaceX dark night
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // --- Draw Grid (Background vibe) ---
      const gridSize = 40;
      const gridOffset = (frameCountRef.current * 0.3) % gridSize;
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      for (let x = -gridSize + gridOffset; x < GAME_WIDTH + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, GAME_HEIGHT);
        ctx.stroke();
      }
      for (let y = -gridSize + gridOffset; y < GAME_HEIGHT + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(GAME_WIDTH, y);
        ctx.stroke();
      }

      // --- Draw Path (Track) ---
      // 1. Dark wide backing
      ctx.beginPath();
      ctx.moveTo(PATH[0].x, PATH[0].y);
      for (let i = 1; i < PATH.length; i++) {
        ctx.lineTo(PATH[i].x, PATH[i].y);
      }
      ctx.lineWidth = 36;
      ctx.strokeStyle = "#0d0d0f"; // Night soft backing
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      ctx.lineWidth = 28;
      ctx.strokeStyle = "#17171a"; // Dark inner road
      ctx.stroke();

      // 2. Neon cyan glowing power rails (circuit look)
      ctx.beginPath();
      ctx.moveTo(PATH[0].x, PATH[0].y);
      for (let i = 1; i < PATH.length; i++) {
        ctx.lineTo(PATH[i].x, PATH[i].y);
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = theme.accent; // Cyan rail
      ctx.lineDashOffset = -frameCountRef.current * 2;
      ctx.setLineDash([8, 12]);
      
      // Glow settings
      ctx.shadowColor = theme.accent;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Reset shadow for performance
      ctx.shadowBlur = 0;

      // 3. Portals / Gates
      // Starting Portal (Korostyshiv Granite Pit Entry)
      const startX = PATH[0].x;
      const startY = PATH[0].y;
      ctx.beginPath();
      ctx.arc(startX + 15, startY, 20, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(34, 197, 94, 0.25)"; // green tint
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px var(--font-display)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ВХІД", startX + 15, startY);

      // Ending Gate (KODLOHUB Core)
      const endX = PATH[PATH.length - 1].x;
      const endY = PATH[PATH.length - 1].y;
      ctx.beginPath();
      ctx.arc(endX - 15, endY, 22, 0, Math.PI * 2);
      ctx.fillStyle = livesRef.current < 40 ? "rgba(239, 68, 68, 0.25)" : "rgba(56, 189, 248, 0.25)"; // pulse red if health low
      ctx.strokeStyle = livesRef.current < 40 ? "#ef4444" : "#38bdf8";
      ctx.lineWidth = 3;
      ctx.shadowColor = livesRef.current < 40 ? "#ef4444" : "#38bdf8";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px var(--font-display)";
      ctx.fillText("CORE", endX - 15, endY);

      // --- Draw Mines ---
      minesRef.current.forEach((mine) => {
        const pulse = Math.sin(frameCountRef.current * 0.15) * 0.3 + 0.7;
        // Mine body (small red circle)
        ctx.beginPath();
        ctx.arc(mine.x, mine.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239, 68, 68, ${0.6 * pulse})`;
        ctx.fill();
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 1;
        ctx.stroke();
        // Trigger radius indicator (subtle)
        ctx.beginPath();
        ctx.arc(mine.x, mine.y, mine.triggerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.12 * pulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // --- Draw Thrown Mines ---
      mineProjectilesRef.current.forEach((mp) => {
        const arcHeight = Math.sin(mp.progress * Math.PI) * 16;
        // Ground shadow shrinks as the mine lands
        ctx.beginPath();
        ctx.arc(mp.x, mp.y + 2, 3 + (1 - mp.progress) * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${0.25 * (1 - mp.progress * 0.5)})`;
        ctx.fill();
        // Flying mine emoji
        ctx.save();
        ctx.translate(mp.x, mp.y - arcHeight);
        ctx.rotate(mp.progress * Math.PI * 2);
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("💣", 0, 0);
        ctx.restore();
      });

      // --- Draw Speed Trails (pink candy dust) ---
      speedTrailsRef.current.forEach((trail) => {
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, trail.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(244, 63, 94, ${0.08 * (trail.life / 120)})`;
        ctx.fill();
      });

      // --- Draw Obstacles ---
      OBSTACLES.forEach((obs) => {
        // Draw glow aura
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${obs.color === "#1d4ed8" ? "29, 78, 216" : obs.color === "#6b21a8" ? "107, 33, 168" : "75, 85, 99"}, 0.12)`;
        ctx.strokeStyle = obs.borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fill();

        // Draw inner obstacle body
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.radius - 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(10, 10, 10, 0.85)";
        ctx.fill();

        // Draw emoji
        ctx.fillStyle = "#ffffff";
        ctx.font = "20px var(--font-display)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(obs.emoji, obs.x, obs.y);

        // Draw name label below
        ctx.font = "bold 8px var(--font-display)";
        ctx.fillStyle = "rgba(156, 163, 175, 0.85)"; // text-ink-mute
        ctx.fillText(obs.name.toUpperCase(), obs.x, obs.y + obs.radius - 1);
      });

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
        // Base ring
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = "#0d0d0f"; // dark plate
        ctx.strokeStyle = selectedPlacedTowerId === tower.id ? "#ffffff" : tower.color;
        ctx.lineWidth = selectedPlacedTowerId === tower.id ? 2.5 : 1.5;
        ctx.fill();
        ctx.stroke();

        // Level indicator stars/dots on top border of tower
        ctx.fillStyle = tower.color;
        for (let l = 0; l < tower.level; l++) {
          const angle = -Math.PI / 2 + (l - (tower.level - 1) / 2) * 0.3;
          const sx = tower.x + Math.cos(angle) * 23;
          const sy = tower.y + Math.sin(angle) * 23;
          ctx.beginPath();
          ctx.arc(sx, sy, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw emoji inside (rotate toward nearest enemy)
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
        ctx.save();
        ctx.translate(tower.x, tower.y);
        ctx.rotate(towerAngle);
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tower.emoji, 0, 0);
        ctx.restore();

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

          // Small support icon above tower
          ctx.font = "10px Arial";
          ctx.fillText("✦", tower.x, tower.y - 24);
        }

        // Camo buff indicator
        if (tower.hasCamoBuff && !tower.camoDetection) {
          ctx.font = "9px Arial";
          ctx.fillText("👁", tower.x + 14, tower.y - 18);
        }
      });

      // --- Draw Shop Hover or Drag Preview (on top of towers) ---
      const activePreviewType = draggedTowerTypeRef.current || selectedShopTowerRef.current;
      const previewPos = draggedTowerPosRef.current || (selectedShopTowerRef.current && isMouseOnCanvasRef.current ? mousePosRef.current : null);

      if (activePreviewType && previewPos && previewPos.x > 0 && previewPos.y > 0) {
        const config = TOWER_CONFIGS[activePreviewType];
        if (config) {
          const onPath = isPositionOnPath(previewPos.x, previewPos.y, 26);
          const onObstacle = OBSTACLES.some((obs) => getDistance(previewPos.x, previewPos.y, obs.x, obs.y) < obs.radius + 18);
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

          // Tower base preview circle
          ctx.beginPath();
          ctx.arc(previewPos.x, previewPos.y, 18, 0, Math.PI * 2);
          ctx.fillStyle = invalid ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)";
          ctx.strokeStyle = invalid ? "#ef4444" : "#22c55e";
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();

          // Tower emoji
          ctx.font = "20px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#ffffff";
          ctx.globalAlpha = 0.8;
          ctx.fillText(config.emoji, previewPos.x, previewPos.y);
          ctx.globalAlpha = 1.0;

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
            ctx.fillText(`☕ ${config.cost}`, previewPos.x, previewPos.y + 28);
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

        // Base circle
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fillStyle = enemy.color;
        ctx.strokeStyle = enemy.borderColor;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // Draw emoji inside
        ctx.font = `${enemy.radius * 1.2}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(enemy.emoji, enemy.x, enemy.y);

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
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.rotate(proj.spinRotation ?? proj.angle);

        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Draw rotated projectile emoji
        ctx.fillText(proj.emoji, 0, 0);

        ctx.restore();
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
    await submitGlobalScore(name, score, finalWave);
    // Reload merged leaderboard
    const local = getLocalLeaderboard();
    const global = await fetchGlobalLeaderboard();
    setLeaderboard(mergeLeaderboards(global, local));
    setScoreSubmitted(true);
  };

  const selectedPlacedTower = selectedTower;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* LEFT: Game Scene Area */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        {/* Top Control Bar */}
        <div className="card-dark p-4 flex flex-wrap items-center justify-between gap-4 border-hairline-dark">
          {/* Status Display */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="micro-cap text-ink-mute">Нерви Кодла (HP)</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl">❤️</span>
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
                <span className="text-xl">☕</span>
                <span className="text-xl font-bold font-[var(--font-display)] text-yellow-500">
                  {gold}
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="micro-cap text-ink-mute">Score</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl">⭐</span>
                <span className="text-xl font-bold font-[var(--font-display)] text-purple-400">
                  {score}
                </span>
              </div>
            </div>

            <div className="flex flex-col min-w-[140px]">
              <span className="micro-cap text-ink-mute">Накат Братви (Хвиля)</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl">🌊</span>
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
              {leaderboard.length > 0 && (
                <div className="w-full max-w-xs mb-4 text-left">
                  <p className="micro-cap text-ink-mute mb-2 text-center">ЛЕДЕРБОРД</p>
                  <div className="bg-zinc-900/80 border border-hairline-dark rounded p-2 max-h-48 overflow-y-auto">
                    {leaderboard.map((e, i) => (
                      <div key={i} className={`flex items-center justify-between py-1 px-2 text-xs ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-on-primary-mute"}`}>
                        <span className="flex items-center gap-2">
                          <span className="w-5 text-right font-bold">{i + 1}.</span>
                          <span className="truncate max-w-[120px]">{e.name}</span>
                        </span>
                        <span className="font-bold">{e.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              {leaderboard.length > 0 && (
                <div className="w-full max-w-xs mb-4 text-left">
                  <p className="micro-cap text-ink-mute mb-2 text-center">ЛЕДЕРБОРД</p>
                  <div className="bg-zinc-900/80 border border-hairline-dark rounded p-2 max-h-48 overflow-y-auto">
                    {leaderboard.map((e, i) => (
                      <div key={i} className={`flex items-center justify-between py-1 px-2 text-xs ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-on-primary-mute"}`}>
                        <span className="flex items-center gap-2">
                          <span className="w-5 text-right font-bold">{i + 1}.</span>
                          <span className="truncate max-w-[120px]">{e.name}</span>
                        </span>
                        <span className="font-bold">{e.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              {leaderboard.length > 0 && (
                <div className="w-full max-w-xs text-left">
                  <p className="micro-cap text-ink-mute mb-2 text-center">ЛЕДЕРБОРД</p>
                  <div className="bg-zinc-900/60 border border-hairline-dark rounded p-2 max-h-36 overflow-y-auto">
                    {leaderboard.map((e, i) => (
                      <div key={i} className={`flex items-center justify-between py-1 px-2 text-xs ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-on-primary-mute"}`}>
                        <span className="flex items-center gap-2">
                          <span className="w-5 text-right font-bold">{i + 1}.</span>
                          <span className="truncate max-w-[120px]">{e.name}</span>
                        </span>
                        <span className="font-bold">{e.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Wave Preview */}
        {gameStatus === "playing" && !isWaveActive && (() => {
          const nextWaveNum = wave;
          if (nextWaveNum > 56) return null;
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
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {types.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-black/40 border border-hairline-dark rounded text-xs" title={t}>
                    <span className="text-base">{EMOJI_MAP[t] || "?"}</span>
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
        {selectedPlacedTower ? (
          // Upgrades Panel (appears when a placed tower is selected, replacing shop)
          <div className="card-dark p-4 border-hairline-dark bg-canvas-night-soft animate-slide-up">
            <div className="flex items-center justify-between border-b border-hairline-dark pb-3 mb-3">
              <div>
                <h3 className="font-bold text-on-primary flex items-center gap-2 button-cap">
                  <span>{selectedPlacedTower.emoji}</span>
                  {selectedPlacedTower.name}
                </h3>
                <p className="text-xs text-ink-mute mt-0.5">Рівень: {selectedPlacedTower.level} | Убивств: {selectedPlacedTower.totalKills}</p>
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
                      }                  )()) * 0.8
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
                          ЗАБЛОКОВАНО
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
                const isSelected = selectedShopTower === type;
                return (
                  <div key={type} className="relative group">
                    <button
                      disabled={gameStatus !== "playing"}
                      draggable={gameStatus === "playing" && canAfford}
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
                          : canAfford
                          ? "border-hairline-dark hover:border-on-primary-mute hover:bg-canvas-night-soft cursor-grab"
                          : "border-hairline-dark/40 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <span>{config.emoji}</span>
                        <span className="font-semibold text-on-primary">{config.name}</span>
                      </span>
                      <span className="text-xs font-bold font-[var(--font-display)] text-yellow-500">
                        ☕ {config.cost}
                      </span>
                    </button>
                    {/* Tooltip on hover */}
                    <div className="absolute z-50 left-0 right-0 bottom-full mb-1 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <div className="bg-zinc-900 border border-hairline-dark rounded p-3 shadow-xl text-xs">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-base">{config.emoji}</span>
                          <span className="font-bold text-on-primary text-sm">{config.name}</span>
                          <span className="text-yellow-500 font-bold">☕ {config.cost}</span>
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
                            <div className="col-span-2"><span className="text-green-400">👁 Виявляє камуфляж</span></div>
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
