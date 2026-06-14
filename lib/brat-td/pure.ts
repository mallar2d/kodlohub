/**
 * Pure helpers used by both the engine and the client UI for Brat TD.
 *
 * Everything in this file is deterministic and browser-free. The client
 * imports these for upgrade previews, the renderer for scene theming, and
 * the engine for stat calculations.
 */

import {
  COFFEE_BUFF_DEFAULTS,
  NON_ENDLESS_WAVE_COUNT,
  SUPPORT_TOWERS,
} from "@/app/(main)/tools/brat-td/gameConfig";
import type {
  DifficultyKey,
  MapDecorPatch,
  PlacedTower,
  SceneTheme,
  Upgrade,
  UpgradeStats,
} from "./types";

// ─── Difficulty ──────────────────────────────────────────────────────

export interface DifficultyConfig {
  label: string;
  description: string;
  lives: number;
  gold: number;
  hpMult: number;
  speedMult: number;
  rewardMult: number;
}

export const DIFFICULTY_CONFIG: Record<DifficultyKey, DifficultyConfig> = {
  easy: { label: "Легко", description: "+ресурси, м'якша братва", lives: 375, gold: 450, hpMult: 0.85, speedMult: 0.95, rewardMult: 1.1 },
  normal: { label: "Нормально", description: "чесний Коростишів", lives: 300, gold: 350, hpMult: 1, speedMult: 1, rewardMult: 1 },
  hard: { label: "Пекло", description: "братва без гальм", lives: 225, gold: 300, hpMult: 1.18, speedMult: 1.08, rewardMult: 0.92 }
};

/**
 * Scales a freshly-spawned enemy according to the active difficulty. Mutates
 * and returns the same reference for convenient call sites.
 */
export function applyDifficultyToEnemy<
  T extends { hp: number; maxHp?: number; speed: number; reward: number; damage: number; shieldHp?: number; maxShieldHp?: number }
>(enemy: T, difficulty: DifficultyKey): T {
  const config = DIFFICULTY_CONFIG[difficulty];
  enemy.hp = Math.max(1, Math.floor(enemy.hp * config.hpMult));
  if (enemy.maxHp !== undefined) enemy.maxHp = enemy.hp;
  if (enemy.shieldHp !== undefined) {
    enemy.shieldHp = Math.max(1, Math.floor(enemy.shieldHp * config.hpMult));
    enemy.maxShieldHp = enemy.shieldHp;
  }
  enemy.speed *= config.speedMult;
  enemy.reward = Math.max(1, Math.floor(enemy.reward * config.rewardMult));
  enemy.damage = Math.max(1, Math.floor(enemy.damage * (difficulty === "hard" ? 1.15 : difficulty === "easy" ? 0.85 : 1)));
  return enemy;
}

// ─── Wave reward formula ─────────────────────────────────────────────

/**
 * Gold bonus for clearing a non-endless wave. Used both to reward the
 * player and to scale game balance progression.
 */
export function getNonEndlessWaveClearReward(wave: number): number {
  if (wave < 1 || wave > NON_ENDLESS_WAVE_COUNT) return 0;

  const earlyCatchUp = wave <= 8 ? Math.max(0, 90 - wave * 8) : 0;
  const progression = 40 + wave * 12;
  const milestone = Math.floor(wave / 5) * 25 + Math.floor(wave / 10) * 40;
  return progression + milestone + earlyCatchUp;
}

// ─── Tower stat helpers ──────────────────────────────────────────────

/** Coffee/Bankomat buffs are stored as flat +percent on the tower. */
export function getEffectiveTowerDamage(tower: PlacedTower): number {
  return tower.damage * (1 + (tower.coffeeDamageBonus || 0) / 100);
}

/** Coffee/Bankomat buffs extend range by both flat pixels and percent. */
export function getEffectiveTowerRange(tower: PlacedTower): number {
  return tower.range + (tower.coffeeRangeBonus || 0) + tower.range * (tower.coffeeRangeBuffPercent || 0);
}

/** Expected DPS using crit / gacha / multi-shot probabilities. */
export function getExpectedDps(
  tower: Pick<
    PlacedTower,
    "damage" | "fireRate" | "critChance" | "critMultiplier" | "gachaChance" | "gachaDamageOverride" | "alwaysDouble" | "twoHits"
  >
): number {
  if (!tower.fireRate) return 0;
  let dmg = tower.damage;
  if (tower.critChance) dmg *= (1 - tower.critChance) + tower.critChance * (tower.critMultiplier || 3);
  if (tower.gachaChance) dmg = dmg * (1 - tower.gachaChance) + (tower.gachaDamageOverride || 300) * tower.gachaChance;
  const shotMult = tower.alwaysDouble ? 2 : tower.twoHits ? 4 / 3 : 1;
  return (dmg * shotMult) / tower.fireRate;
}

// ─── Upgrade stat (de)serialization ──────────────────────────────────

/** Stat keys copied between PlacedTower and UpgradeStats during upgrade apply/preview. */
export const UPGRADE_STAT_KEYS: (keyof UpgradeStats)[] = [
  "range", "damage", "fireRate", "twoHits", "critChance", "buffMultiplier",
  "endOfWaveBonus", "isAoESlow", "damageDebuff", "freezeChance", "gachaChance",
  "copilotBug", "slowAmount", "antiArmor", "ignoresArmor", "alwaysDouble",
  "critMultiplier", "damageBuff", "rangeBuff", "ignoreArmorBuff", "rangeBuffPercent",
  "slowDurationBonus", "slowFactorBonus", "explodeDmg", "gachaDamageOverride",
  "freezeDurationBonus", "bsodAoE", "bugExplodeDmg", "bugExplodeRadius", "bugContagion",
  "disableGlitch", "disableAbilities", "camoDetection", "camoDetectionBuff", "pierce",
  "tackCount", "maxMines", "mineExplodes", "knockbackChance", "knockbackDistance",
  "microStunDuration", "wallBounce", "tripleShot", "quadShot", "everyNthTriple",
  "spreadChance", "spreadDamageBonus", "gachaDamageMultiplier", "conditionalTripleWithPierce",
  "fireDoTDamage", "fireDoTDuration", "fireDoTMaxStacks", "antiRegenFactor"
];

/** Project a placed tower down to a flat UpgradeStats snapshot. */
export function buildUpgradeStats(tower: PlacedTower): UpgradeStats {
  const stats: Partial<UpgradeStats> = {};
  UPGRADE_STAT_KEYS.forEach((key) => {
    (stats as Record<string, unknown>)[key] = (tower as unknown as Record<string, unknown>)[key];
  });
  return stats as UpgradeStats;
}

/** Write an UpgradeStats object back onto a placed tower, preserving the pierce floor. */
export function applyUpgradeStats(tower: PlacedTower, stats: UpgradeStats): void {
  UPGRADE_STAT_KEYS.forEach((key) => {
    if (key in stats) {
      (tower as unknown as Record<string, unknown>)[key] = stats[key];
    }
  });
  tower.pierce = stats.pierce || 1;
}

// ─── Tower classification & support buff pass ───────────────────────

/** True for towers that buff neighbours (Coffee, Bankomat, Gas, etc.). */
export const isSupportTowerType = (type: string) => SUPPORT_TOWERS.has(type);

/**
 * BTD6 cross-path rules:
 *   - At most 2 paths may have any tier purchased.
 *   - At most 1 path may reach tier 3 or higher.
 */
export function checkUpgradeAllowed(path1: number, path2: number, path3: number, pathIndex: number): boolean {
  const newTiers = [path1, path2, path3];
  newTiers[pathIndex]++;
  if (newTiers[pathIndex] > 5) return false;
  const activePaths = newTiers.filter((t) => t > 0).length;
  const highTiers = newTiers.filter((t) => t >= 3).length;
  return activePaths <= 2 && highTiers <= 1;
}

/**
 * Pre-calculates aura buffs from support towers (Coffee/Bankomat/Gas) for
 * every tower. Mirrors the engine logic so the UI can preview buffs.
 */
export function calculateTowerBuffs(
  towers: PlacedTower[],
  options: { getDistance: (x1: number, y1: number, x2: number, y2: number) => number }
): void {
  const supportTowers = towers.filter((t) => isSupportTowerType(t.type));
  towers.forEach((tower) => {
    let maxBuff = 0;
    let hasCamoBuff = false;
    let maxDamageBuff = 0;
    let maxRangeBuff = 0;
    let maxRangeBuffPercent = 0;
    let maxIgnoreArmorBuff = 0;
    supportTowers.forEach((supportTower) => {
      const dist = options.getDistance(tower.x, tower.y, supportTower.x, supportTower.y);
      if (dist <= supportTower.range) {
        const buffVal = supportTower.buffMultiplier || (supportTower.type === "coffee" ? COFFEE_BUFF_DEFAULTS.attackSpeed : 0);
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

// ─── Scene theming (read by the renderer) ────────────────────────────

export const SCENE_THEMES: SceneTheme[] = [
  { skyTop: "#071016", skyBottom: "#111a14", groundA: "#10170f", groundB: "#172416", groundC: "#22301c", trackOuter: "#070707", trackEdge: "#28231d", trackInner: "#4a4032", trackLine: "rgba(244, 218, 154, 0.36)", accent: "#38bdf8" },
  { skyTop: "#090b1e", skyBottom: "#171125", groundA: "#121026", groundB: "#1d1932", groundC: "#28203d", trackOuter: "#090813", trackEdge: "#2e293d", trackInner: "#514861", trackLine: "rgba(199, 210, 254, 0.34)", accent: "#818cf8" },
  { skyTop: "#1d0f04", skyBottom: "#251707", groundA: "#20150b", groundB: "#34230f", groundC: "#463016", trackOuter: "#0f0904", trackEdge: "#3d2a16", trackInner: "#5d4326", trackLine: "rgba(251, 191, 36, 0.34)", accent: "#f59e0b" },
  { skyTop: "#170514", skyBottom: "#210818", groundA: "#190d16", groundB: "#291220", groundC: "#3a1830", trackOuter: "#0b0509", trackEdge: "#3d2033", trackInner: "#57304b", trackLine: "rgba(244, 114, 182, 0.32)", accent: "#ec4899" },
  { skyTop: "#02180b", skyBottom: "#082116", groundA: "#07170c", groundB: "#102817", groundC: "#17351f", trackOuter: "#030a05", trackEdge: "#173120", trackInner: "#2f4a31", trackLine: "rgba(134, 239, 172, 0.30)", accent: "#22c55e" },
];

export const MAP_DECOR: MapDecorPatch[] = [
  { x: 72, y: 314, r: 38, color: "rgba(63, 98, 48, 0.42)" },
  { x: 222, y: 58, r: 28, color: "rgba(69, 58, 39, 0.35)" },
  { x: 382, y: 176, r: 30, color: "rgba(58, 88, 46, 0.36)" },
  { x: 538, y: 334, r: 46, color: "rgba(44, 72, 48, 0.38)" },
  { x: 734, y: 76, r: 34, color: "rgba(65, 54, 43, 0.34)" },
  { x: 718, y: 452, r: 42, color: "rgba(38, 66, 42, 0.36)" },
];

// ─── UI formatters (used by both client and progress display) ────────

/** MM:SS formatter for round times. */
export function formatSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Trim trailing ".0" from decimals. */
export function formatStat(value: number): string {
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(1).replace(/\.0$/, "");
}

/** Stable, comma-joined string for upgrade diff previews. */
export function getUpgradePreview(tower: PlacedTower, upgrade: Upgrade): string {
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
}
