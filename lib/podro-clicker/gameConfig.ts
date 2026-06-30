// ==========================================
// ПОДРО-КЛІКЕР — конфіг балансу гри
// ==========================================
// Жанр: incremental clicker (як Cookie Clicker), тема — культ Подро.
// Ресурс: ГРАМИ НЕСКАФЕ ГОЛД. Клікаєш на Подро — він варить тобі каву.

export type HelperId =
  | "shemetovany"
  | "kodlo"
  | "turka"
  | "hammer_vending"
  | "podroid"
  | "slopus_farm"
  | "zt_barista"
  | "golovnyi_podro";

export interface HelperConfig {
  id: HelperId;
  name: string;
  flavor: string;
  baseCost: number;
  baseGps: number;
}

// Зростання ціни помічника за кожну куплену одиницю (стандарт жанру).
export const COST_GROWTH = 1.15;

export const HELPERS: HelperConfig[] = [
  {
    id: "shemetovany",
    name: "ШЕМЕТОВАНИЙ З ЛОЖКОЮ",
    flavor: "Новенький. Ще не знає, що буде далі.",
    baseCost: 15,
    baseGps: 0.1,
  },
  {
    id: "kodlo",
    name: "КОДЛО З ЧАЙНИКОМ",
    flavor: "Кип'ятить воду й розказує мемчики.",
    baseCost: 100,
    baseGps: 1,
  },
  {
    id: "turka",
    name: "ТУРКА ПОДРОФІКОВАНОГО",
    flavor: "Справжня турка, освячена рівно о 22:00.",
    baseCost: 1_100,
    baseGps: 8,
  },
  {
    id: "hammer_vending",
    name: "МОЛОТКОВИЙ АВТОМАТ",
    flavor: "Б'є по апарату, поки не випаде Nescafe Gold.",
    baseCost: 12_000,
    baseGps: 47,
  },
  {
    id: "podroid",
    name: "ПОДРОЇД-БОТ",
    flavor: "Powered by PODROID. Не спить, не їсть, варить.",
    baseCost: 130_000,
    baseGps: 260,
  },
  {
    id: "slopus_farm",
    name: "СЛОПУС AI ФЕРМА",
    flavor: "ШІ генерує каву швидше, ніж лор про Подро.",
    baseCost: 1_400_000,
    baseGps: 1_400,
  },
  {
    id: "zt_barista",
    name: "ZT-BARISTA STREAM",
    flavor: "24/7 ефір. Баріста ніколи не спить.",
    baseCost: 20_000_000,
    baseGps: 7_800,
  },
  {
    id: "golovnyi_podro",
    name: "ГОЛОВНИЙ ПОДРО",
    flavor: "Сама легенда варить тобі особисто. Респект.",
    baseCost: 330_000_000,
    baseGps: 44_000,
  },
];

export const HELPERS_BY_ID: Record<HelperId, HelperConfig> = Object.fromEntries(
  HELPERS.map((h) => [h.id, h]),
) as Record<HelperId, HelperConfig>;

export type UpgradeKind = "click_flat" | "click_mult" | "click_percent_gps" | "crit_chance" | "building_mult" | "global_mult";

export interface UpgradeConfig {
  id: string;
  name: string;
  description: string;
  cost: number;
  kind: UpgradeKind;
  value: number;
  /** Для building_mult — який саме помічник підсилюємо */
  helperId?: HelperId;
  /** Скільки треба мати куплених помічників цього типу, щоб апгрейд з'явився в магазині */
  requiresHelperOwned?: number;
  /** Скільки треба заробити загалом (career), щоб апгрейд з'явився */
  requiresCareerGrams?: number;
}

export const UPGRADES: UpgradeConfig[] = [
  // --- клікові апгрейди ---
  {
    id: "u_spoon",
    name: "ГОСТРІША ЛОЖКА",
    description: "+1 грам за клік.",
    cost: 50,
    kind: "click_flat",
    value: 1,
  },
  {
    id: "u_double_click",
    name: "ТУРЕЦЬКИЙ МОЛОТОК",
    description: "Сила кліку x2.",
    cost: 500,
    kind: "click_mult",
    value: 2,
  },
  {
    id: "u_hot_hand",
    name: "ГАРЯЧА РУКА",
    description: "+5% шанс критичного кліку (x22 грам).",
    cost: 5_000,
    kind: "crit_chance",
    value: 0.05,
  },
  {
    id: "u_hand_of_podro",
    name: "РУКА ПОДРО",
    description: "Клік додатково дає 1% від твоєї продукції/с.",
    cost: 50_000,
    kind: "click_percent_gps",
    value: 0.01,
    requiresCareerGrams: 20_000,
  },
  {
    id: "u_blessed_spoon",
    name: "БЛАГОСЛОВЕННА ЛОЖКА",
    description: "Сила кліку ще раз x2.",
    cost: 500_000,
    kind: "click_mult",
    value: 2,
    requiresCareerGrams: 100_000,
  },
  // --- апгрейди помічників (по одному на тип, класика жанру) ---
  {
    id: "u_b_shemetovany",
    name: "КАВОВА ЛОЖКА 2.0",
    description: "Шеметовані варять х2.",
    cost: 150,
    kind: "building_mult",
    value: 2,
    helperId: "shemetovany",
    requiresHelperOwned: 1,
  },
  {
    id: "u_b_kodlo",
    name: "ЧАЙНИК З БЛЮЗОМ",
    description: "Кодло з чайником варить х2.",
    cost: 1_000,
    kind: "building_mult",
    value: 2,
    helperId: "kodlo",
    requiresHelperOwned: 5,
  },
  {
    id: "u_b_turka",
    name: "ТУРКА З БЛАГОДАТТЮ",
    description: "Турки варять х2.",
    cost: 11_000,
    kind: "building_mult",
    value: 2,
    helperId: "turka",
    requiresHelperOwned: 10,
  },
  {
    id: "u_b_hammer_vending",
    name: "МОЛОТОК 2.0",
    description: "Молоткові автомати варять х2.",
    cost: 120_000,
    kind: "building_mult",
    value: 2,
    helperId: "hammer_vending",
    requiresHelperOwned: 10,
  },
  {
    id: "u_b_podroid",
    name: "ПОДРОЇД V2",
    description: "Подроїд-боти варять х2.",
    cost: 1_300_000,
    kind: "building_mult",
    value: 2,
    helperId: "podroid",
    requiresHelperOwned: 10,
  },
  {
    id: "u_b_slopus_farm",
    name: "СЛОПУС PRO",
    description: "AI-ферми варять х2.",
    cost: 14_000_000,
    kind: "building_mult",
    value: 2,
    helperId: "slopus_farm",
    requiresHelperOwned: 10,
  },
  {
    id: "u_b_zt_barista",
    name: "BARISTA PREMIUM",
    description: "ZT-Barista стріми варять х2.",
    cost: 200_000_000,
    kind: "building_mult",
    value: 2,
    helperId: "zt_barista",
    requiresHelperOwned: 10,
  },
  {
    id: "u_b_golovnyi_podro",
    name: "КУЛЬТ ПОДРО",
    description: "Головні Подро варять х2.",
    cost: 1_650_000_000,
    kind: "building_mult",
    value: 2,
    helperId: "golovnyi_podro",
    requiresHelperOwned: 5,
  },
  // --- глобальні апгрейди ---
  {
    id: "u_g_nescafe_gold",
    name: "NESCAFE GOLD",
    description: "Вся продукція x1.5.",
    cost: 100_000,
    kind: "global_mult",
    value: 1.5,
    requiresCareerGrams: 50_000,
  },
  {
    id: "u_g_ritual_2200",
    name: "РИТУАЛ 22:00",
    description: "Вся продукція ще раз x1.5.",
    cost: 5_000_000,
    kind: "global_mult",
    value: 1.5,
    requiresCareerGrams: 2_000_000,
  },
];

export const UPGRADES_BY_ID: Record<string, UpgradeConfig> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
);

// --- ачівки (косметичні, прив'язані до career-валюти) ---
export interface AchievementConfig {
  id: string;
  name: string;
  description: string;
  threshold: number; // careerGrams
}

export const ACHIEVEMENTS: AchievementConfig[] = [
  { id: "a_first_spoon", name: "ПЕРША ЛОЖКА", description: "Заварив перші 10г.", threshold: 10 },
  { id: "a_hundred", name: "СОТКА", description: "100г кави позаду.", threshold: 100 },
  { id: "a_thousand", name: "КІЛОГРАМ", description: "1 000г. Кодло гордиться.", threshold: 1_000 },
  { id: "a_ten_k", name: "БАРИСТА-ПОЧАТКІВЕЦЬ", description: "10 000г наварено.", threshold: 10_000 },
  { id: "a_hundred_k", name: "КОФЕЇНОВИЙ МАНЬЯК", description: "100 000г наварено.", threshold: 100_000 },
  { id: "a_million", name: "МІЛЬЙОН ГРАМ", description: "1 000 000г. Час спати? Ні.", threshold: 1_000_000 },
  { id: "a_hundred_million", name: "NESCAFE ІМПЕРІЯ", description: "100 000 000г наварено.", threshold: 100_000_000 },
  { id: "a_billion", name: "МІЛЬЯРД ГРАМ", description: "1 000 000 000г. Це вже хвороба.", threshold: 1_000_000_000 },
  { id: "a_trillion", name: "ГОЛОВНИЙ БАРИСТА ВСЕСВІТУ", description: "1 000 000 000 000г наварено.", threshold: 1_000_000_000_000 },
];

// --- косметичний "культовий ранг" за career-валютою (паралель до ролей сайту) ---
export interface RankConfig {
  id: string;
  label: string;
  threshold: number;
  colorClass: string;
}

export const RANKS: RankConfig[] = [
  { id: "shemetovany", label: "ШЕМЕТОВАНИЙ КЛІКЕР", threshold: 0, colorClass: "text-ink-mute" },
  { id: "kodlo", label: "КОДЛО КЛІКЕР", threshold: 5_000, colorClass: "text-on-primary" },
  { id: "podrofikovany", label: "ПОДРОФІКОВАНИЙ КЛІКЕР", threshold: 500_000, colorClass: "text-purple-400" },
  { id: "owner", label: "ГОЛОВНИЙ ПОДРО КЛІКЕР", threshold: 50_000_000, colorClass: "text-yellow-400" },
];

export function getRankForCareerGrams(careerGrams: number): RankConfig {
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (careerGrams >= rank.threshold) current = rank;
  }
  return current;
}

// --- 22:00 бонус (та сама конвенція, що й у молотка) ---
export const SPECIAL_HOUR = 22;
export const SPECIAL_MULTIPLIER = 22;
// ПОДРО-ГОДИНА триває лише перші 5 хвилин після 22:00, а не всю годину.
export const SPECIAL_WINDOW_MINUTES = 5;

// --- критичний клік ---
export const BASE_CRIT_CHANCE = 0.04;
export const CRIT_MULTIPLIER = 22;

// --- престиж ("ШЕМЕТУВАННЯ") ---
export const PRESTIGE_THRESHOLD = 1_000_000;
export const RESPECT_MULTIPLIER_PER_POINT = 0.02;

// --- офлайн прогрес ---
export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
export const OFFLINE_EFFICIENCY = 0.5; // офлайн варить вдвічі гірше за онлайн

export const STORAGE_KEY = "podro_clicker_state_v1";
export const BASE_CLICK_POWER = 1;

// --- репліки Подро, що зринають при кліку (низький шанс показу) ---
export const CLICK_QUOTES = [
  "Я ПОДРО.",
  "Почув.",
  "Ще ложку.",
  "Турка кипить.",
  "Nescafe Gold forever.",
  "Кодло, не зупиняйся.",
  "22:00 наближається...",
  "Молоток чекає.",
  "Похуй, варимо далі.",
  "Нескафе — це святе.",
];

export const CRIT_QUOTES = [
  "КРИТ! x22!",
  "ПОДРО-ГОДИНА В КЛІКУ!",
  "БЛАГОДАТЬ НЕСКАФЕ!",
  "ОСВЯЧЕНО О 22:00!",
];

export const OFFLINE_MESSAGES = [
  "Поки тебе не було, кодло наварило",
  "Турки не спали — наварено ще",
  "Подроїд-бот працював без тебе:",
];

export function getHelperCost(helper: HelperConfig, owned: number): number {
  return Math.ceil(helper.baseCost * Math.pow(COST_GROWTH, owned));
}

export function getRespectGain(careerGrams: number): number {
  if (careerGrams < PRESTIGE_THRESHOLD) return 0;
  return Math.floor(Math.pow(careerGrams / 1_000_000, 1 / 3) * 10);
}

/** Обернена функція до getRespectGain — скільки career grams треба, щоб мати щонайменше N поваги. */
export function getCareerGramsForRespect(respect: number): number {
  if (respect <= 0) return 0;
  return 1_000_000 * Math.pow(respect / 10, 3);
}

const NUMBER_SUFFIXES: [number, string][] = [
  [1e18, "Кв"],
  [1e15, "Кд"],
  [1e12, "Т"],
  [1e9, "Б"],
  [1e6, "М"],
  [1e3, "К"],
];

export function formatGrams(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  if (abs < 1000) {
    return Number.isInteger(value) ? value.toString() : value.toFixed(fractionDigits);
  }
  for (const [threshold, suffix] of NUMBER_SUFFIXES) {
    if (abs >= threshold) {
      return `${(value / threshold).toFixed(fractionDigits)}${suffix}`;
    }
  }
  return value.toFixed(fractionDigits);
}

export function isSpecialHour(date: Date = new Date()): boolean {
  return date.getHours() === SPECIAL_HOUR && date.getMinutes() < SPECIAL_WINDOW_MINUTES;
}
