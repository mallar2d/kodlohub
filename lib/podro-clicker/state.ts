// ==========================================
// ПОДРО-КЛІКЕР — чиста логіка стану (без UI, без I/O)
// ==========================================

import {
  ACHIEVEMENTS,
  BASE_CLICK_POWER,
  BASE_CRIT_CHANCE,
  CRIT_MULTIPLIER,
  HELPERS,
  HELPERS_BY_ID,
  type HelperId,
  MAX_OFFLINE_MS,
  OFFLINE_EFFICIENCY,
  PRESTIGE_THRESHOLD,
  RESPECT_MULTIPLIER_PER_POINT,
  SPECIAL_MULTIPLIER,
  UPGRADES_BY_ID,
  getHelperCost,
  getRespectGain,
  isSpecialHour,
} from "./gameConfig";

export interface ClickerState {
  grams: number;
  careerGrams: number;
  totalClicks: number;
  helpers: Partial<Record<HelperId, number>>;
  upgrades: string[];
  achievements: string[];
  respectPoints: number;
  prestigeCount: number;
  lastTickAt: number;
}

export function createInitialState(now: number = Date.now()): ClickerState {
  return {
    grams: 0,
    careerGrams: 0,
    totalClicks: 0,
    helpers: {},
    upgrades: [],
    achievements: [],
    respectPoints: 0,
    prestigeCount: 0,
    lastTickAt: now,
  };
}

function ownedCount(state: ClickerState, id: HelperId): number {
  return state.helpers[id] ?? 0;
}

/** Множник усіх куплених building_mult / global_mult апгрейдів для конкретного помічника. */
function buildingMultiplierFor(state: ClickerState, id: HelperId): number {
  let mult = 1;
  for (const upgradeId of state.upgrades) {
    const upgrade = UPGRADES_BY_ID[upgradeId];
    if (upgrade?.kind === "building_mult" && upgrade.helperId === id) {
      mult *= upgrade.value;
    }
  }
  return mult;
}

export function getGlobalMultiplier(state: ClickerState): number {
  let mult = 1;
  for (const upgradeId of state.upgrades) {
    const upgrade = UPGRADES_BY_ID[upgradeId];
    if (upgrade?.kind === "global_mult") mult *= upgrade.value;
  }
  return mult;
}

export function getPrestigeMultiplier(state: ClickerState): number {
  return 1 + state.respectPoints * RESPECT_MULTIPLIER_PER_POINT;
}

/** Базова продукція грамів/с без урахування бонусу 22:00. */
export function computeBaseGps(state: ClickerState): number {
  const globalMult = getGlobalMultiplier(state) * getPrestigeMultiplier(state);
  let total = 0;
  for (const helper of HELPERS) {
    const owned = ownedCount(state, helper.id);
    if (owned <= 0) continue;
    total += owned * helper.baseGps * buildingMultiplierFor(state, helper.id);
  }
  return total * globalMult;
}

/** Поточна реальна продукція грамів/с з урахуванням 22:00 бонусу. */
export function computeEffectiveGps(state: ClickerState, date: Date = new Date()): number {
  const base = computeBaseGps(state);
  return isSpecialHour(date) ? base * SPECIAL_MULTIPLIER : base;
}

export function getCritChance(state: ClickerState): number {
  let chance = BASE_CRIT_CHANCE;
  for (const upgradeId of state.upgrades) {
    const upgrade = UPGRADES_BY_ID[upgradeId];
    if (upgrade?.kind === "crit_chance") chance += upgrade.value;
  }
  return Math.min(chance, 0.5);
}

/** Базова сила кліку (без крита, без бонусу 22:00). */
export function computeClickPower(state: ClickerState): number {
  let flat = BASE_CLICK_POWER;
  let mult = 1;
  let percentOfGps = 0;
  for (const upgradeId of state.upgrades) {
    const upgrade = UPGRADES_BY_ID[upgradeId];
    if (!upgrade) continue;
    if (upgrade.kind === "click_flat") flat += upgrade.value;
    if (upgrade.kind === "click_mult") mult *= upgrade.value;
    if (upgrade.kind === "click_percent_gps") percentOfGps += upgrade.value;
  }
  const gpsBonus = percentOfGps > 0 ? computeBaseGps(state) * percentOfGps : 0;
  const globalMult = getGlobalMultiplier(state) * getPrestigeMultiplier(state);
  return (flat * mult + gpsBonus) * globalMult;
}

export interface ClickResult {
  state: ClickerState;
  gained: number;
  isCrit: boolean;
  isSpecial: boolean;
}

export function applyClick(state: ClickerState, date: Date = new Date(), rng: () => number = Math.random): ClickResult {
  const basePower = computeClickPower(state);
  const isSpecial = isSpecialHour(date);
  const isCrit = rng() < getCritChance(state);
  let gained = basePower;
  if (isSpecial) gained *= SPECIAL_MULTIPLIER;
  if (isCrit) gained *= CRIT_MULTIPLIER;

  const nextState: ClickerState = {
    ...state,
    grams: state.grams + gained,
    careerGrams: state.careerGrams + gained,
    totalClicks: state.totalClicks + 1,
  };

  return { state: nextState, gained, isCrit, isSpecial };
}

export interface TickResult {
  state: ClickerState;
  gained: number;
}

/** Просуває симуляцію на deltaMs (для реального онлайн-тіку, ефективність 100%). */
export function tick(state: ClickerState, deltaMs: number, date: Date = new Date()): TickResult {
  if (deltaMs <= 0) return { state, gained: 0 };
  const gps = computeEffectiveGps(state, date);
  const gained = gps * (deltaMs / 1000);
  return {
    state: {
      ...state,
      grams: state.grams + gained,
      careerGrams: state.careerGrams + gained,
      lastTickAt: state.lastTickAt + deltaMs,
    },
    gained,
  };
}

export interface OfflineResult {
  state: ClickerState;
  gained: number;
  cappedMs: number;
}

/** Нараховує офлайн-прогрес з моменту lastTickAt до now, з кепом і пенальті ефективності. */
export function applyOfflineProgress(state: ClickerState, now: number = Date.now()): OfflineResult {
  const elapsed = Math.max(0, now - state.lastTickAt);
  const cappedMs = Math.min(elapsed, MAX_OFFLINE_MS);
  if (cappedMs <= 0) {
    return { state: { ...state, lastTickAt: now }, gained: 0, cappedMs: 0 };
  }
  const gps = computeBaseGps(state); // офлайн без 22:00-вгадування — рахуємо по поточному часу як базу
  const gained = gps * (cappedMs / 1000) * OFFLINE_EFFICIENCY;
  return {
    state: {
      ...state,
      grams: state.grams + gained,
      careerGrams: state.careerGrams + gained,
      lastTickAt: now,
    },
    gained,
    cappedMs,
  };
}

export function getHelperPrice(state: ClickerState, id: HelperId): number {
  const helper = HELPERS_BY_ID[id];
  return getHelperCost(helper, ownedCount(state, id));
}

export function canAffordHelper(state: ClickerState, id: HelperId): boolean {
  return state.grams >= getHelperPrice(state, id);
}

export function buyHelper(state: ClickerState, id: HelperId): ClickerState | null {
  const price = getHelperPrice(state, id);
  if (state.grams < price) return null;
  return {
    ...state,
    grams: state.grams - price,
    helpers: { ...state.helpers, [id]: ownedCount(state, id) + 1 },
  };
}

export function isUpgradeVisible(state: ClickerState, upgradeId: string): boolean {
  const upgrade = UPGRADES_BY_ID[upgradeId];
  if (!upgrade) return false;
  if (state.upgrades.includes(upgradeId)) return false;
  if (upgrade.requiresHelperOwned != null && upgrade.helperId) {
    if (ownedCount(state, upgrade.helperId) < upgrade.requiresHelperOwned) return false;
  }
  if (upgrade.requiresCareerGrams != null && state.careerGrams < upgrade.requiresCareerGrams) return false;
  return true;
}

export function buyUpgrade(state: ClickerState, upgradeId: string): ClickerState | null {
  const upgrade = UPGRADES_BY_ID[upgradeId];
  if (!upgrade) return null;
  if (!isUpgradeVisible(state, upgradeId)) return null;
  if (state.grams < upgrade.cost) return null;
  return {
    ...state,
    grams: state.grams - upgrade.cost,
    upgrades: [...state.upgrades, upgradeId],
  };
}

export function checkNewAchievements(state: ClickerState): string[] {
  const unlocked: string[] = [];
  for (const achievement of ACHIEVEMENTS) {
    if (state.achievements.includes(achievement.id)) continue;
    if (state.careerGrams >= achievement.threshold) unlocked.push(achievement.id);
  }
  return unlocked;
}

export function applyNewAchievements(state: ClickerState): ClickerState {
  const newOnes = checkNewAchievements(state);
  if (newOnes.length === 0) return state;
  return { ...state, achievements: [...state.achievements, ...newOnes] };
}

export function canPrestige(state: ClickerState): boolean {
  return state.careerGrams >= PRESTIGE_THRESHOLD;
}

export function getPendingRespectGain(state: ClickerState): number {
  return getRespectGain(state.careerGrams);
}

/** "ШЕМЕТУВАННЯ" — престиж-ресет. Career/ачівки/кліки/респект НЕ скидаються. */
export function doPrestige(state: ClickerState, now: number = Date.now()): ClickerState {
  if (!canPrestige(state)) return state;
  const gained = getRespectGain(state.careerGrams);
  return {
    ...state,
    grams: 0,
    helpers: {},
    upgrades: [],
    respectPoints: state.respectPoints + gained,
    prestigeCount: state.prestigeCount + 1,
    lastTickAt: now,
  };
}

/** Безпечно нормалізує довільний об'єкт у валідний ClickerState (захист від побитих/чужих даних). */
export function normalizeState(raw: unknown, now: number = Date.now()): ClickerState {
  const base = createInitialState(now);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;

  const helpers: Partial<Record<HelperId, number>> = {};
  if (r.helpers && typeof r.helpers === "object") {
    for (const helper of HELPERS) {
      const value = (r.helpers as Record<string, unknown>)[helper.id];
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        helpers[helper.id] = Math.floor(Math.min(value, 1_000_000));
      }
    }
  }

  const upgrades = Array.isArray(r.upgrades)
    ? r.upgrades.filter((id): id is string => typeof id === "string" && id in UPGRADES_BY_ID)
    : [];

  const achievements = Array.isArray(r.achievements)
    ? r.achievements.filter((id): id is string => typeof id === "string" && ACHIEVEMENTS.some((a) => a.id === id))
    : [];

  const safeNumber = (value: unknown, max: number) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.min(value, max) : 0;

  return {
    grams: safeNumber(r.grams, 1e21),
    careerGrams: safeNumber(r.careerGrams, 1e21),
    totalClicks: safeNumber(r.totalClicks, 1e9),
    helpers,
    upgrades,
    achievements,
    respectPoints: safeNumber(r.respectPoints, 1e9),
    prestigeCount: safeNumber(r.prestigeCount, 1e6),
    lastTickAt: typeof r.lastTickAt === "number" && Number.isFinite(r.lastTickAt) ? r.lastTickAt : now,
  };
}
