export interface PathPoint {
  x: number;
  y: number;
}

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 500;

export const PATH: PathPoint[] = [
  { x: 0, y: 100 },
  { x: 450, y: 100 },
  { x: 450, y: 240 },
  { x: 150, y: 240 },
  { x: 150, y: 400 },
  { x: 680, y: 400 },
  { x: 680, y: 220 },
  { x: 800, y: 220 }
];

export interface Obstacle {
  x: number;
  y: number;
  radius: number;
  name: string;
  emoji: string;
  color: string;
  borderColor: string;
}

export const OBSTACLES: Obstacle[] = [
  { x: 260, y: 170, radius: 35, name: "Коростишівський Граніт", emoji: "🪨", color: "#4b5563", borderColor: "#374151" },
  { x: 320, y: 320, radius: 32, name: "Озеро Nescafe", emoji: "💧", color: "#1d4ed8", borderColor: "#1e3a8a" },
  { x: 580, y: 160, radius: 28, name: "Зламаний Infinix", emoji: "📴", color: "#6b21a8", borderColor: "#581c87" }
];


export interface UpgradeStats {
  range: number;
  damage: number;
  fireRate: number;
  twoHits?: boolean;
  critChance?: number;
  buffMultiplier?: number;
  endOfWaveBonus?: number;
  isAoESlow?: boolean;
  damageDebuff?: number;
  freezeChance?: number;
  gachaChance?: number;
  copilotBug?: boolean;
  slowAmount?: number;
  antiArmor?: boolean;
  // BTD6-style additional stats to avoid type casting
  ignoresArmor?: boolean;
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
  pierce?: number;
  tackCount?: number;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: (stats: UpgradeStats) => UpgradeStats;
}

export interface TowerStats {
  cost: number;
  range: number;
  damage: number;
  fireRate: number; // In seconds between shots
  name: string;
  description: string;
  color: string; // Theme color for canvas representation
  emoji: string;
  camoDetection?: boolean;
  pierce?: number;
  tackCount?: number;
}

export interface TowerConfig extends TowerStats {
  upgrades: {
    path1: Upgrade[];
    path2: Upgrade[];
    path3: Upgrade[];
  };
}

export interface EnemyConfig {
  name: string;
  hp: number;
  speed: number; // Pixels per frame (at 60fps)
  reward: number; // Nescafe Gold earned on kill
  damage: number; // Nerves lost if reached end
  color: string;
  borderColor: string;
  radius: number;
  description: string;
  isArmored?: boolean; // physical/hammer damage reduced by 50%
  isSuperArmored?: boolean; // physical/hammer damage reduced by 75%
  isGlitching?: boolean; // teleports forward occasionally
  isSlowingTowers?: boolean; // reduces fireRate of nearby towers
  isSpawningTrail?: boolean; // spawns pink trail that speeds up other enemies
  onDeath?: (enemyX: number, enemyY: number, spawnEnemyCallback: (type: string, x: number, y: number) => void) => void;
  isCamo?: boolean;
  isRegen?: boolean;
  isLead?: boolean;
  isPhantomCamo?: boolean;
  isExploder?: boolean;
  glitchDistance?: number;
  shieldHp?: number;
  shieldRegenDelay?: number;
  isHealer?: boolean;
  tier?: number; // 1-5, scales stats
}

// Tier scaling: each tier makes enemies harder
// Higher tiers inherit abilities from lower tiers
export const TIER_SCALING = [
  // tier 1: base (waves 1-10)
  { hpMult: 1.0, speedMult: 1.0, damageReduce: 0, rewardMult: 1.0, inheritsRegen: false, inheritsArmor: false, inheritsLead: false },
  // tier 2: tough (waves 11-20)
  { hpMult: 1.5, speedMult: 1.05, damageReduce: 0.10, rewardMult: 1.3, inheritsRegen: false, inheritsArmor: false, inheritsLead: false },
  // tier 3: elite (waves 21-30)
  { hpMult: 2.5, speedMult: 1.10, damageReduce: 0.20, rewardMult: 1.8, inheritsRegen: true, inheritsArmor: false, inheritsLead: false },
  // tier 4: champion (waves 31-40)
  { hpMult: 4.0, speedMult: 1.15, damageReduce: 0.30, rewardMult: 2.5, inheritsRegen: true, inheritsArmor: true, inheritsLead: false },
  // tier 5: legend (waves 41-46+)
  { hpMult: 5.5, speedMult: 1.18, damageReduce: 0.35, rewardMult: 3.4, inheritsRegen: true, inheritsArmor: true, inheritsLead: false },
];

export function getTierForWave(waveNumber: number): number {
  if (waveNumber <= 10) return 1;
  if (waveNumber <= 20) return 2;
  if (waveNumber <= 30) return 3;
  if (waveNumber <= 40) return 4;
  return 5;
}

export const TOWER_CONFIGS: Record<string, TowerConfig> = {
  hammer: {
    name: "Подро з Молотком",
    description: "Кидає молоток у найближчого брата. Базовий юніт.",
    cost: 200,
    range: 140,
    damage: 32,
    fireRate: 1.1,
    color: "#38bdf8", // Sky blue
    emoji: "🔨",
    pierce: 1,
    upgrades: {
      path1: [
        { id: "hammer_sharp", name: "Гострий молоток", description: "Збільшує шкоду молотка на 5.", cost: 130, effect: (s) => ({ ...s, damage: s.damage + 5 }) },
        { id: "hammer_steel", name: "Сталеве гартування", description: "Шкода +10, пробиття (пірс) +1.", cost: 300, effect: (s) => ({ ...s, damage: s.damage + 10, pierce: (s.pierce || 1) + 1 }) },
        { id: "hammer_heavy", name: "Важкий молоток", description: "Шкода +25, радіус +10, пірс +2, але атака на 25% повільніша.", cost: 700, effect: (s) => ({ ...s, damage: s.damage + 25, range: s.range + 10, fireRate: s.fireRate * 1.25, pierce: (s.pierce || 1) + 2 }) },
        { id: "hammer_breaker", name: "Руйнівник граніту", description: "Шкода +45, пірс +2. Молотки ігнорують броню.", cost: 1385, effect: (s) => ({ ...s, damage: s.damage + 45, ignoresArmor: true, pierce: (s.pierce || 1) + 2 }) },
        { id: "hammer_thor", name: "Молот Тора ЗТ", description: "Велетенська шкода (+130), радіус (+35) та великий пірс (+6).", cost: 5015, effect: (s) => ({ ...s, damage: s.damage + 130, range: s.range + 35, pierce: (s.pierce || 1) + 6 }) }
      ],
      path2: [
        { id: "hammer_fast", name: "Швидка рука", description: "Збільшує швидкість атаки на 15%.", cost: 155, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.85 }) },
        { id: "hammer_espresso", name: "Еспресо-рефлекс", description: "Збільшує швидкість атаки ще на 30%.", cost: 330, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.70 }) },
        { id: "hammer_two_hits", name: "Два удари", description: "Кожен 3-й удар кидає два молотки одночасно.", cost: 610, effect: (s) => ({ ...s, twoHits: true }) },
        { id: "hammer_gatling", name: "Кулемет молотків", description: "Надшвидке кидання молотків (швидкість +55%).", cost: 1585, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.45 }) },
        { id: "hammer_berserk", name: "Ентропійний Берсерк", description: "Кидає 2 молотки при кожному ударі, швидкість +75%.", cost: 6270, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.25, alwaysDouble: true }) }
      ],
      path3: [
        { id: "hammer_long", name: "Дальній кидок", description: "Збільшує дальність кидка на 25px.", cost: 108, effect: (s) => ({ ...s, range: s.range + 25 }) },
        { id: "hammer_eagle", name: "Орлине око", description: "Дальність кидка +35px, пірс +1, виявляє камуфляж.", cost: 230, effect: (s) => ({ ...s, range: s.range + 35, camoDetection: true, pierce: (s.pierce || 1) + 1 }) },
        { id: "hammer_crit", name: "Критичний ПОЧУВ", description: "20% шанс нанести 3-кратну шкоду, пірс +1.", cost: 580, effect: (s) => ({ ...s, critChance: 0.20, pierce: (s.pierce || 1) + 1 }) },
        { id: "hammer_deep", name: "Глибокий аналіз", description: "Дальність +30px, шанс криту 40%, пірс +1.", cost: 1190, effect: (s) => ({ ...s, range: s.range + 30, critChance: 0.40, pierce: (s.pierce || 1) + 1 }) },
        { id: "hammer_legend", name: "Легенда без слів", description: "Шанс криту 60%, критичні удари наносять 6x шкоду.", cost: 4180, effect: (s) => ({ ...s, critChance: 0.60, critMultiplier: 6 }) }
      ]
    }
  },
  coffee: {
    name: "Nescafe Ritual",
    description: "Підтримка. Не атакує, але збільшує швидкість атаки башт поруч та генерує пасивний дохід.",
    cost: 650,
    range: 110,
    damage: 0,
    fireRate: 0,
    color: "#eab308", // Gold/yellow
    emoji: "☕",
    upgrades: {
      path1: [
        { id: "coffee_aromatic", name: "Ароматна кава", description: "Баф швидкості атаки стає +10%.", cost: 660, effect: (s) => ({ ...s, buffMultiplier: 0.10 }) },
        { id: "coffee_sugar", name: "Кава з цукром", description: "Баф швидкості атаки стає +18%.", cost: 1240, effect: (s) => ({ ...s, buffMultiplier: 0.18 }) },
        { id: "coffee_no_sugar", name: "Gold без цукру", description: "Баф швидкості атаки стає +25%.", cost: 2890, effect: (s) => ({ ...s, buffMultiplier: 0.25 }) },
        { id: "coffee_concentrate", name: "Надконцентрат", description: "Баф швидкості атаки стає +40%.", cost: 5940, effect: (s) => ({ ...s, buffMultiplier: 0.40 }) },
        { id: "coffee_addiction", name: "Кавова залежність", description: "Баф швидкості атаки сусідніх веж стає +60%.", cost: 15675, effect: (s) => ({ ...s, buffMultiplier: 0.60 }) }
      ],
      path2: [
        { id: "coffee_sieve", name: "Широке сито", description: "Збільшує радіус дії бафу на 15px.", cost: 530, effect: (s) => ({ ...s, range: s.range + 15 }) },
        { id: "coffee_pour", name: "Термоядерний розлив", description: "Радіус бафу +25px.", cost: 990, effect: (s) => ({ ...s, range: s.range + 25 }) },
        { id: "coffee_shot", name: "Енергетичний шот", description: "Приносить +30 Gold наприкінці кожної хвилі.", cost: 2320, effect: (s) => ({ ...s, endOfWaveBonus: (s.endOfWaveBonus || 0) + 30 }) },
        { id: "coffee_thermos", name: "Термос АТБ", description: "Приносить ще +80 Gold наприкінці кожної хвилі.", cost: 4950, effect: (s) => ({ ...s, endOfWaveBonus: (s.endOfWaveBonus || 0) + 80 }) },
        { id: "coffee_tycoon", name: "Кавовий магнат", description: "Приносить величезні +300 Gold наприкінці кожної хвилі.", cost: 12540, effect: (s) => ({ ...s, endOfWaveBonus: (s.endOfWaveBonus || 0) + 300 }) }
      ],
      path3: [
        { id: "coffee_sour", name: "Кислинка", description: "Вежі в радіусі отримують +1% до шкоди.", cost: 660, effect: (s) => ({ ...s, damageBuff: (s.damageBuff || 0) + 1 }) },
        { id: "coffee_bitter", name: "Гіркота", description: "Вежі в радіусі отримують ще +3% до шкоди.", cost: 1440, effect: (s) => ({ ...s, damageBuff: (s.damageBuff || 0) + 3 }) },
        { id: "coffee_roast", name: "Міцне обсмаження", description: "+8% шкоди, +10px дальності та виявлення камуфляжу для веж поруч.", cost: 3370, effect: (s) => ({ ...s, damageBuff: (s.damageBuff || 0) + 8, rangeBuff: (s.rangeBuff || 0) + 10, camoDetectionBuff: true }) },
        { id: "coffee_mocha", name: "Мокко Підсилення", description: "Швидкість атаки веж в радіусі +12%.", cost: 6230, effect: (s) => ({ ...s, buffMultiplier: (s.buffMultiplier || 0.05) + 0.12 }) },
        { id: "coffee_elixir", name: "Коростишівський Еліксир", description: "Вежі в радіусі отримують +30% до шкоди та +25% дальності.", cost: 14630, effect: (s) => ({ ...s, damageBuff: (s.damageBuff || 0) + 30, rangeBuffPercent: 0.25 }) }
      ]
    }
  },
  candy: {
    name: "Рачки Launcher",
    description: "Стріляє святими цукерками «Рачки», які сповільнюють братів на 50%.",
    cost: 275,
    range: 150,
    damage: 6,
    fireRate: 1.5,
    color: "#f97316", // Orange
    emoji: "🍬",
    pierce: 1,
    upgrades: {
      path1: [
        { id: "candy_sweet", name: "Солодкий удар", description: "Шкода від цукерок +3.", cost: 130, effect: (s) => ({ ...s, damage: s.damage + 3 }) },
        { id: "candy_press", name: "Карамель-прес", description: "Шкода +7, сповільнення триває на 1 секунду довше.", cost: 300, effect: (s) => ({ ...s, damage: s.damage + 7, slowDurationBonus: (s.slowDurationBonus || 0) + 60 }) },
        { id: "candy_dust", name: "Пил часу", description: "Сповільнені вороги отримують на 30% більше шкоди від усіх джерел.", cost: 655, effect: (s) => ({ ...s, damageDebuff: 1.3 }) },
        { id: "candy_paralysis", name: "Цукровий параліч", description: "Сповільнення збільшується з 50% до 70%.", cost: 1385, effect: (s) => ({ ...s, slowFactorBonus: 0.2 }) },
        { id: "candy_stop", name: "Абсолютний стоп", description: "Сповільнення стає 85%, вороги отримують на 60% більше шкоди.", cost: 4595, effect: (s) => ({ ...s, slowFactorBonus: 0.35, damageDebuff: 1.6 }) }
      ],
      path2: [
        { id: "candy_big", name: "Великі рачки", description: "Дальність стрільби цукерками +15px.", cost: 108, effect: (s) => ({ ...s, range: s.range + 15 }) },
        { id: "candy_dispense", name: "Швидкий викид", description: "Швидкість стрільби цукерками +25%.", cost: 260, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.75 }) },
        { id: "candy_teacher", name: "Дар викладачці", description: "Цукерки вибухають при влучанні (радіус 60px), пірс +1 та бачить камуфляж.", cost: 850, effect: (s) => ({ ...s, isAoESlow: true, camoDetection: true, pierce: (s.pierce || 1) + 1 }) },
        { id: "candy_cloud", name: "Рачкове хмариння", description: "Вибух покриває 100px, наносить 15 шкоди, пірс +2.", cost: 1780, effect: (s) => ({ ...s, range: s.range + 15, isAoESlow: true, explodeDmg: 15, pierce: (s.pierce || 1) + 2 }) },
        { id: "candy_singularity", name: "Рачкова сингулярність", description: "Вибух у 150px наносить 80 шкоди, миттєво стопить натовп, пірс +5.", cost: 5435, effect: (s) => ({ ...s, isAoESlow: true, explodeDmg: 80, range: s.range + 20, pierce: (s.pierce || 1) + 5 }) }
      ],
      path3: [
        { id: "candy_sugar_cheap", name: "Дешевий цукор", description: "Апгрейд Candy Launcher стає дешевшим (повертає 30 Gold).", cost: 78, effect: (s) => s },
        { id: "candy_cheap", name: "Кишеньковий запас", description: "Швидкість атаки +20%, повертає 40 Gold.", cost: 195, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.8 }) },
        { id: "candy_bakery", name: "Свята цукерня", description: "Швидкість стрільби збільшується на 40%.", cost: 580, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.6 }) },
        { id: "candy_vending", name: "Автомат рачків", description: "Стріляє цукерками на 60% швидше.", cost: 1505, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.4 }) },
        { id: "candy_conveyor", name: "Конвеєр Коростишева", description: "Неймовірна швидкість стрільби (кожні 0.3с), шкода +15.", cost: 4180, effect: (s) => ({ ...s, fireRate: 0.3, damage: s.damage + 15 }) }
      ]
    }
  },
  infinix: {
    name: "Infinix Tower",
    description: "Стріляє нестабільними цифровими імпульсами. Непередбачувана шкода. Бачить камуфляж.",
    cost: 440,
    range: 120,
    damage: 30,
    fireRate: 0.8,
    color: "#a855f7", // Purple
    emoji: "📱",
    camoDetection: true,
    pierce: 1,
    upgrades: {
      path1: [
        { id: "infinix_voltage", name: "Висока напруга", description: "Збільшує середню шкоду на 5.", cost: 185, effect: (s) => ({ ...s, damage: s.damage + 5 }) },
        { id: "infinix_discharge", name: "Цифровий розряд", description: "Шкода +15.", cost: 400, effect: (s) => ({ ...s, damage: s.damage + 15 }) },
        { id: "infinix_gacha", name: "Гача-зрив", description: "5% шанс завдати колосальні 300 одиниць шкоди (Джекпот!).", cost: 960, effect: (s) => ({ ...s, gachaChance: 0.05 }) },
        { id: "infinix_jackpot", name: "Джекпот-адикт", description: "Шанс джекпоту збільшується до 12% на 350 шкоди.", cost: 1980, effect: (s) => ({ ...s, gachaChance: 0.12, damage: s.damage + 10 }) },
        { id: "infinix_pull", name: "5-Зірковий пул", description: "Шанс джекпоту 25%, шкода джекпоту стає 600.", cost: 6270, effect: (s) => ({ ...s, gachaChance: 0.25, gachaDamageOverride: 600 }) }
      ],
      path2: [
        { id: "infinix_refresh90", name: "Частота 90Гц", description: "Збільшує швидкість імпульсу на 15%.", cost: 210, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.85 }) },
        { id: "infinix_refresh120", name: "Частота 120Гц", description: "Швидкість стрільби +30%.", cost: 430, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.70 }) },
        { id: "infinix_lag", name: "Лаг 999 мс", description: "Імпульси мають 15% шанс повністю заморозити ворога на 1 секунду, пірс +1.", cost: 885, effect: (s) => ({ ...s, freezeChance: 0.15, pierce: (s.pierce || 1) + 1 }) },
        { id: "infinix_freeze", name: "Критичний фриз", description: "Шанс заморозки 30%, тривалість 2 секунди, пірс +2.", cost: 1900, effect: (s) => ({ ...s, freezeChance: 0.30, freezeDurationBonus: 60, pierce: (s.pierce || 1) + 2 }) },
        { id: "infinix_bsod", name: "Синій екран (BSOD)", description: "45% шанс заморозити ворога на 3с. Заморожені вороги сповільнюють сусідів, пірс +4.", cost: 5545, effect: (s) => ({ ...s, freezeChance: 0.45, freezeDurationBonus: 120, bsodAoE: true, pierce: (s.pierce || 1) + 4 }) }
      ],
      path3: [
        { id: "infinix_4g", name: "Сигнал 4G", description: "Дальність стрільби вежі +25px.", cost: 130, effect: (s) => ({ ...s, range: s.range + 25 }) },
        { id: "infinix_5g", name: "Антена 5G", description: "Дальність вежі +40px.", cost: 300, effect: (s) => ({ ...s, range: s.range + 40 }) },
        { id: "infinix_copilot", name: "Copilot Manager", description: "Заражає ворога багом. При смерті ворога з багом, він вибухає на 50 шкоди навколо.", cost: 1080, effect: (s) => ({ ...s, copilotBug: true }) },
        { id: "infinix_worm", name: "Мережевий черв", description: "Вибух багу наносить 90 шкоди в радіусі 100px.", cost: 2180, effect: (s) => ({ ...s, copilotBug: true, bugExplodeDmg: 90, bugExplodeRadius: 100 }) },
        { id: "infinix_super", name: "Суперкомп'ютер", description: "Вибух наносить 250 шкоди, розповсюджуючи баг на сусідніх ворогів.", cost: 6690, effect: (s) => ({ ...s, copilotBug: true, bugExplodeDmg: 250, bugExplodeRadius: 150, bugContagion: true }) }
      ]
    }
  },
  gas: {
    name: "Газовий Tack Shooter",
    description: "Стріляє газовими шипами в усі боки. Сильний у поворотах дороги, але більше не має пасивної aura-шкоди.",
    cost: 360,
    range: 82,
    damage: 10,
    fireRate: 0.9,
    color: "#22c55e", // Green
    emoji: "💨",
    pierce: 1,
    tackCount: 6,
    upgrades: {
      path1: [
        { id: "gas_sharp", name: "Їдкі Шипи", description: "Шкода шипів +3.", cost: 130, effect: (s) => ({ ...s, damage: s.damage + 3 }) },
        { id: "gas_more", name: "Більше Форсунок", description: "+2 газові шипи за залп.", cost: 300, effect: (s) => ({ ...s, tackCount: (s.tackCount || 6) + 2 }) },
        { id: "gas_corrosive", name: "Корозійний Газ", description: "Шкода +8, шипи краще беруть броню.", cost: 700, effect: (s) => ({ ...s, damage: s.damage + 8, antiArmor: true }) },
        { id: "gas_blade", name: "Газові Леза", description: "Шкода +14, пірс +1, +2 шипи.", cost: 1780, effect: (s) => ({ ...s, damage: s.damage + 14, pierce: (s.pierce || 1) + 1, tackCount: (s.tackCount || 6) + 2 }) },
        { id: "gas_inferno", name: "Токсичне Кільце", description: "Шкода +28, пірс +2, +4 шипи, ігнорує броню.", cost: 5545, effect: (s) => ({ ...s, damage: s.damage + 28, pierce: (s.pierce || 1) + 2, tackCount: (s.tackCount || 6) + 4, ignoresArmor: true }) }
      ],
      path2: [
        { id: "gas_fast", name: "Швидкий Клапан", description: "Швидкість стрільби +18%.", cost: 155, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.82 }) },
        { id: "gas_stasis", name: "Капсула Стазису", description: "Шипи сповільнюють на 35%.", cost: 330, effect: (s) => ({ ...s, slowAmount: 0.35 }) },
        { id: "gas_acid", name: "Кислотні Шипи", description: "Швидкість +25%, вороги отримують на 20% більше шкоди.", cost: 850, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.75, damageDebuff: 1.20 }) },
        { id: "gas_asphyxia", name: "Ядуха", description: "Швидкість +35%, сповільнення 55%.", cost: 1980, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.65, slowAmount: 0.55 }) },
        { id: "gas_weapon", name: "Біологічний Ротор", description: "Швидкість +45%, сповільнення 70%, +2 шипи.", cost: 6270, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.55, slowAmount: 0.70, tackCount: (s.tackCount || 6) + 2, damageDebuff: 1.35 }) }
      ],
      path3: [
        { id: "gas_range", name: "Довгі Сопла", description: "Дальність +18px.", cost: 108, effect: (s) => ({ ...s, range: s.range + 18 }) },
        { id: "gas_scanner", name: "Біо-Сканер", description: "Виявляє камуфляж, дальність +12px.", cost: 260, effect: (s) => ({ ...s, camoDetection: true, range: s.range + 12 }) },
        { id: "gas_glitch", name: "Глючний Газ", description: "Шипи вимикають телепорти ворогів при влучанні.", cost: 770, effect: (s) => ({ ...s, disableGlitch: true }) },
        { id: "gas_gacha", name: "Гача-Форсунка", description: "6% шанс на 80 додаткової шкоди при влучанні.", cost: 1900, effect: (s) => ({ ...s, gachaChance: 0.06, gachaDamageOverride: 80 }) },
        { id: "gas_entropy", name: "Ентропійний Ротор", description: "Шипи вимикають здібності, +12 шкоди, +4 шипи.", cost: 5150, effect: (s) => ({ ...s, damage: s.damage + 12, tackCount: (s.tackCount || 6) + 4, disableGlitch: true, disableAbilities: true }) }
      ]
    }
  },
  sniper: {
    name: "Снайпер Подро",
    description: "Далекобійний снайпер. Бачить камуфляж, б'є боляче, але рідко.",
    cost: 350,
    range: 250,
    damage: 108,
    fireRate: 3.0,
    color: "#f43f5e",
    emoji: "🎯",
    camoDetection: true,
    pierce: 1,
    upgrades: {
      path1: [
        { id: "sniper_heavy_cal", name: "Важкий калібр", description: "Шкода +40.", cost: 265, effect: (s) => ({ ...s, damage: s.damage + 40 }) },
        { id: "sniper_armor_piercing", name: "Бронебійний", description: "Шкода +60, ігнорує броню.", cost: 600, effect: (s) => ({ ...s, damage: s.damage + 60, ignoresArmor: true }) },
        { id: "sniper_explosive_round", name: "Вибуховий заряд", description: "Шкода +80, снаряди вибухають (радіус 50px).", cost: 1350, effect: (s) => ({ ...s, damage: s.damage + 80, explodeDmg: 40 }) },
        { id: "sniper_anti_material", name: "Антиматеріальний", description: "Шкода +150, пробиває будь-яку броню.", cost: 2770, effect: (s) => ({ ...s, damage: s.damage + 150, ignoresArmor: true }) },
        { id: "sniper_tactical_nuke", name: "Тактичний ядерний", description: "Шкода +400, вибух 120px, пробиває 3 цілі.", cost: 6270, effect: (s) => ({ ...s, damage: s.damage + 400, explodeDmg: 200, pierce: (s.pierce || 1) + 2 }) }
      ],
      path2: [
        { id: "sniper_fast_reload", name: "Швидка перезарядка", description: "Швидкість атаки +15%.", cost: 265, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.85 }) },
        { id: "sniper_semi_auto", name: "Напівавтомат", description: "Швидкість атаки +25%.", cost: 660, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.75 }) },
        { id: "sniper_double_tap", name: "Подвійний постріл", description: "Кожен 3-й постріл стріляє двічі.", cost: 1350, effect: (s) => ({ ...s, twoHits: true }) },
        { id: "sniper_full_auto", name: "Повний автомат", description: "Швидкість атаки +45%.", cost: 2770, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.55 }) },
        { id: "sniper_minigun", name: "Снайперський мініган", description: "Дуже швидка стрільба, +2 пробиття.", cost: 6270, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.35, pierce: (s.pierce || 1) + 2 }) }
      ],
      path3: [
        { id: "sniper_spotter", name: "Спостерігач", description: "Дальність +30px.", cost: 185, effect: (s) => ({ ...s, range: s.range + 30 }) },
        { id: "sniper_deadeye", name: "Мертве око", description: "25% шанс криту (3x шкода).", cost: 495, effect: (s) => ({ ...s, critChance: 0.25 }) },
        { id: "sniper_headhunter", name: "Мисливець за головами", description: "40% шанс криту (4x шкода).", cost: 1080, effect: (s) => ({ ...s, critChance: 0.40, critMultiplier: 4 }) },
        { id: "sniper_wallhack", name: "Волхак", description: "Бачить всю карту, 50% крит, +2 пробиття.", cost: 2375, effect: (s) => ({ ...s, critChance: 0.50, pierce: (s.pierce || 1) + 2 }) },
        { id: "sniper_one_shot", name: "One Shot One Kill", description: "60% крит (6x шкода), ігнорує броню, +3 пробиття.", cost: 5545, effect: (s) => ({ ...s, critChance: 0.60, critMultiplier: 6, ignoresArmor: true, pierce: (s.pierce || 1) + 3 }) }
      ]
    }
  },
  chain: {
    name: "Ланцюгова Башня",
    description: "Б'є блискавкою, що перескакує між ворогами. Ефективна проти натовпів.",
    cost: 460,
    range: 120,
    damage: 11,
    fireRate: 1.15,
    color: "#0ea5e9",
    emoji: "⚡",
    pierce: 3,
    upgrades: {
      path1: [
        { id: "chain_voltage", name: "Підвищена напруга", description: "Шкода +8.", cost: 210, effect: (s) => ({ ...s, damage: s.damage + 8 }) },
        { id: "chain_overload", name: "Перевантаження", description: "Шкода +15, +1 ланцюг.", cost: 495, effect: (s) => ({ ...s, damage: s.damage + 15, pierce: (s.pierce || 3) + 1 }) },
        { id: "chain_arc", name: "Електрична дуга", description: "Шкода +20, +1 ланцюг.", cost: 1080, effect: (s) => ({ ...s, damage: s.damage + 20, pierce: (s.pierce || 3) + 1 }) },
        { id: "chain_plasma", name: "Плазмовий розряд", description: "Шкода +35, +2 ланцюги.", cost: 2375, effect: (s) => ({ ...s, damage: s.damage + 35, pierce: (s.pierce || 3) + 2 }) },
        { id: "chain_tesla", name: "Котушка Тесла", description: "Шкода +70, +4 ланцюги, ігнорує броню.", cost: 5545, effect: (s) => ({ ...s, damage: s.damage + 70, pierce: (s.pierce || 3) + 4, ignoresArmor: true }) }
      ],
      path2: [
        { id: "chain_conductivity", name: "Провідність", description: "Швидкість атаки +20%.", cost: 210, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.80 }) },
        { id: "chain_capacitor", name: "Конденсатор", description: "Швидкість атаки +30%.", cost: 495, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.70 }) },
        { id: "chain_discharge", name: "Швидкий розряд", description: "Швидкість атаки +40%.", cost: 1080, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.60 }) },
        { id: "chain_rapid", name: "Шквал блискавок", description: "Швидкість атаки +55%.", cost: 2375, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.45 }) },
        { id: "chain_storm", name: "Електричний шторм", description: "Шалена швидкість, виявляє камуфляж.", cost: 5545, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.30, camoDetection: true }) }
      ],
      path3: [
        { id: "chain_static", name: "Статичний заряд", description: "10% шанс оглушити ворога на 0.5с.", cost: 210, effect: (s) => ({ ...s, freezeChance: 0.10 }) },
        { id: "chain_paralyze", name: "Параліч", description: "20% шанс оглушити на 1с.", cost: 495, effect: (s) => ({ ...s, freezeChance: 0.20, freezeDurationBonus: 30 }) },
        { id: "chain_magnetic", name: "Магнітне поле", description: "Сповільнює вражених ворогів на 30%.", cost: 1080, effect: (s) => ({ ...s, slowAmount: 0.30 }) },
        { id: "chain_superconductor", name: "Надпровідник", description: "35% оглушення, сповільнення 50%, +2 ланцюги.", cost: 2375, effect: (s) => ({ ...s, freezeChance: 0.35, slowAmount: 0.50, pierce: (s.pierce || 3) + 2 }) },
        { id: "chain_EMP", name: "ЕМП-імпульс", description: "50% оглушення на 2с, сповільнення 70%, вимикає здібності ворогів.", cost: 5545, effect: (s) => ({ ...s, freezeChance: 0.50, freezeDurationBonus: 120, slowAmount: 0.70, disableAbilities: true }) }
      ]
    }
  },
  kladmen: {
    name: "Кладмен",
    description: "Ставить міни на дорозі. Міни вибухають при контакті, наносячи AoE шкоду. Макс 4 міни одночасно.",
    cost: 275,
    range: 150,
    damage: 35,
    fireRate: 2.0,
    color: "#ef4444",
    emoji: "💣",
    pierce: 3,
    upgrades: {
      path1: [
        { id: "kladmen_powerful", name: "Потужний заряд", description: "Шкода мін +30.", cost: 155, effect: (s) => ({ ...s, damage: s.damage + 30 }) },
        { id: "kladmen_cluster", name: "Касетна міна", description: "Шкода +50, радіус вибуху +20px.", cost: 330, effect: (s) => ({ ...s, damage: s.damage + 50, explodeDmg: 20 }) },
        { id: "kladmen_tnt", name: "ТНТ", description: "Шкода +80, вибух зачіпає 5 цілей.", cost: 700, effect: (s) => ({ ...s, damage: s.damage + 80, pierce: (s.pierce || 3) + 2 }) },
        { id: "kladmen_c4", name: "C4", description: "Шкода +130, пробиває броню.", cost: 1540, effect: (s) => ({ ...s, damage: s.damage + 130, ignoresArmor: true }) },
        { id: "kladmen_nuke", name: "Ядерна міна", description: "Шкода +300, радіус +30px, 8 цілей.", cost: 3850, effect: (s) => ({ ...s, damage: s.damage + 300, pierce: (s.pierce || 3) + 5, ignoresArmor: true }) }
      ],
      path2: [
        { id: "kladmen_fast_deploy", name: "Швидке мінування", description: "Швидкість встановлення +15%.", cost: 155, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.85 }) },
        { id: "kladmen_conveyor", name: "Конвеєр", description: "Швидкість +25%.", cost: 330, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.75 }) },
        { id: "kladmen_factory", name: "Мінна фабрика", description: "Швидкість +30%, дальність +20px.", cost: 700, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.70, range: s.range + 20 }) },
        { id: "kladmen_mass", name: "Масове виробництво", description: "Швидкість +35%, макс 5 мін.", cost: 1540, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.65, twoHits: true }) },
        { id: "kladmen_conveyor_belt", name: "Конвеєр Коростишева", description: "Швидке мінування, макс 6 мін, виявляє камуфляж.", cost: 3850, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.55, alwaysDouble: true, camoDetection: true }) }
      ],
      path3: [
        { id: "kladmen_sticky", name: "Клейка міна", description: "Міни сповільнюють ворогів на 30%.", cost: 155, effect: (s) => ({ ...s, slowAmount: 0.30 }) },
        { id: "kladmen_freeze", name: "Кріо-міна", description: "15% шанс заморозити ворога на 1с.", cost: 330, effect: (s) => ({ ...s, freezeChance: 0.15 }) },
        { id: "kladmen_burn", name: "Запальна міна", description: "Вороги отримують на 25% більше шкоди після вибуху.", cost: 700, effect: (s) => ({ ...s, damageDebuff: 1.25 }) },
        { id: "kladmen_emp", name: "ЕМП-міна", description: "30% шанс оглушити на 2с, вимикає здібності.", cost: 1540, effect: (s) => ({ ...s, freezeChance: 0.30, freezeDurationBonus: 120, disableAbilities: true }) },
        { id: "kladmen_antimatter", name: "Антиматеріальна міна", description: "45% оглушення, сповільнення 50%, вимикає здібності.", cost: 3850, effect: (s) => ({ ...s, freezeChance: 0.45, slowAmount: 0.50, freezeDurationBonus: 120, disableAbilities: true }) }
      ]
    }
  },
  bankomat: {
    name: "Банкомат Nescafe",
    description: "Аналог Monkey Village: не атакує, але підсилює башти поруч, відкриває камуфляж/броню та дає економіку.",
    cost: 600,
    range: 105,
    damage: 0,
    fireRate: 0,
    color: "#facc15",
    emoji: "🏧",
    pierce: 1,
    upgrades: {
      path1: [
        { id: "bankomat_cashback", name: "Кешбек", description: "Дохід +35 наприкінці хвилі, аура дає ще +5px дальності.", cost: 360, effect: (s) => ({ ...s, endOfWaveBonus: (s.endOfWaveBonus || 0) + 35, rangeBuff: (s.rangeBuff || 0) + 5 }) },
        { id: "bankomat_deposit", name: "Депозит", description: "Дохід +55, радіус аури +15px.", cost: 820, effect: (s) => ({ ...s, endOfWaveBonus: (s.endOfWaveBonus || 0) + 55, range: s.range + 15 }) },
        { id: "bankomat_crypto", name: "Крипто Кодла", description: "Дохід +90, вежі поруч стріляють на 8% швидше.", cost: 1720, effect: (s) => ({ ...s, endOfWaveBonus: (s.endOfWaveBonus || 0) + 90, buffMultiplier: Math.max(s.buffMultiplier || 0, 0.08) }) },
        { id: "bankomat_tax", name: "Податкова Оптимізація", description: "Дохід +150, вежі поруч отримують +10% шкоди.", cost: 3550, effect: (s) => ({ ...s, endOfWaveBonus: (s.endOfWaveBonus || 0) + 150, damageBuff: (s.damageBuff || 0) + 10 }) },
        { id: "bankomat_tycoon", name: "Nescafe Capital", description: "Дохід +300, аура дає +18% шкоди та +15% швидкості атаки.", cost: 8200, effect: (s) => ({ ...s, endOfWaveBonus: (s.endOfWaveBonus || 0) + 300, damageBuff: (s.damageBuff || 0) + 18, buffMultiplier: Math.max(s.buffMultiplier || 0, 0.15) }) }
      ],
      path2: [
        { id: "bankomat_wifi", name: "Wi-Fi Термінал", description: "Радіус аури +25px.", cost: 260, effect: (s) => ({ ...s, range: s.range + 25 }) },
        { id: "bankomat_bonus", name: "Бонусна Карта", description: "Аура шкоди для веж поруч стає +8%.", cost: 620, effect: (s) => ({ ...s, damageBuff: Math.max(s.damageBuff || 0, 8) }) },
        { id: "bankomat_premium", name: "Преміум Пакет", description: "Аура дає +15% шкоди, +12% дальності та +10px дальності.", cost: 1420, effect: (s) => ({ ...s, damageBuff: Math.max(s.damageBuff || 0, 15), rangeBuff: (s.rangeBuff || 0) + 10, rangeBuffPercent: Math.max(s.rangeBuffPercent || 0, 0.12) }) },
        { id: "bankomat_black", name: "Чорна Картка", description: "Аура дає +24% шкоди, +20% дальності та +8% швидкості атаки.", cost: 3150, effect: (s) => ({ ...s, damageBuff: Math.max(s.damageBuff || 0, 24), rangeBuffPercent: Math.max(s.rangeBuffPercent || 0, 0.20), buffMultiplier: Math.max(s.buffMultiplier || 0, 0.08) }) },
        { id: "bankomat_platinum", name: "Platinum Gold", description: "Аура дає +40% шкоди, +25% дальності, +12% швидкості та 35% пробиття броні.", cost: 7200, effect: (s) => ({ ...s, damageBuff: Math.max(s.damageBuff || 0, 40), rangeBuffPercent: Math.max(s.rangeBuffPercent || 0, 0.25), buffMultiplier: Math.max(s.buffMultiplier || 0, 0.12), ignoreArmorBuff: 0.35 }) }
      ],
      path3: [
        { id: "bankomat_scanner", name: "Сканер Купюр", description: "Дає камуфляж-детекцію вежам поруч.", cost: 420, effect: (s) => ({ ...s, camoDetectionBuff: true }) },
        { id: "bankomat_range", name: "Мережа Терміналів", description: "Радіус аури +35px, вежі поруч отримують +10px дальності.", cost: 920, effect: (s) => ({ ...s, range: s.range + 35, rangeBuff: (s.rangeBuff || 0) + 10 }) },
        { id: "bankomat_safe", name: "Сейф MIB", description: "Вежі поруч пробивають 25% броні та стріляють на 10% швидше.", cost: 1850, effect: (s) => ({ ...s, ignoreArmorBuff: Math.max(s.ignoreArmorBuff || 0, 0.25), buffMultiplier: Math.max(s.buffMultiplier || 0, 0.10) }) },
        { id: "bankomat_audit", name: "Аудит Братви", description: "+18% дальності, +12% шкоди та повна камуфляж-детекція для аури.", cost: 3600, effect: (s) => ({ ...s, rangeBuffPercent: Math.max(s.rangeBuffPercent || 0, 0.18), damageBuff: (s.damageBuff || 0) + 12, camoDetectionBuff: true }) },
        { id: "bankomat_bank", name: "Центробанк Подро", description: "Village-ядро: +28% дальності, +20% швидкості, 50% пробиття броні та +160 доходу.", cost: 7600, effect: (s) => ({ ...s, endOfWaveBonus: (s.endOfWaveBonus || 0) + 160, rangeBuffPercent: Math.max(s.rangeBuffPercent || 0, 0.28), buffMultiplier: Math.max(s.buffMultiplier || 0, 0.20), ignoreArmorBuff: 0.50, camoDetectionBuff: true }) }
      ]
    }
  },
  monolith: {
    name: "Коростишівський Моноліт",
    description: "Аналог Super Monkey: дорогий, дуже швидко кидає гранітні уламки. Без базового камуфляжу.",
    cost: 1100,
    range: 165,
    damage: 16,
    fireRate: 0.14,
    color: "#9ca3af",
    emoji: "🗿",
    camoDetection: false,
    pierce: 1,
    upgrades: {
      path1: [
        { id: "mono_sharp", name: "Гострі Уламки", description: "Шкода +8.", cost: 520, effect: (s) => ({ ...s, damage: s.damage + 8 }) },
        { id: "mono_dense", name: "Щільний Граніт", description: "Шкода +14, пірс +1.", cost: 1200, effect: (s) => ({ ...s, damage: s.damage + 14, pierce: (s.pierce || 1) + 1 }) },
        { id: "mono_plasma", name: "Плазмовий Кар'єр", description: "Шкода +24, ігнорує броню.", cost: 2600, effect: (s) => ({ ...s, damage: s.damage + 24, ignoresArmor: true }) },
        { id: "mono_sun", name: "Сонячний Моноліт", description: "Шкода +45, пірс +2.", cost: 5400, effect: (s) => ({ ...s, damage: s.damage + 45, pierce: (s.pierce || 1) + 2 }) },
        { id: "mono_temple", name: "Храм Коростишева", description: "Шкода +90, вибух 50px, пірс +3.", cost: 11800, effect: (s) => ({ ...s, damage: s.damage + 90, explodeDmg: 70, pierce: (s.pierce || 1) + 3, ignoresArmor: true }) }
      ],
      path2: [
        { id: "mono_hands", name: "Швидкі Руки", description: "Швидкість атаки +12%.", cost: 480, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.88 }) },
        { id: "mono_reflex", name: "Гранітний Рефлекс", description: "Швидкість +18%.", cost: 1050, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.82 }) },
        { id: "mono_double", name: "Подвійний Уламок", description: "Кожен 3-й постріл подвійний.", cost: 2300, effect: (s) => ({ ...s, twoHits: true }) },
        { id: "mono_laser", name: "Лазерний Кар'єр", description: "Швидкість +25%, пірс +1.", cost: 4800, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.75, pierce: (s.pierce || 1) + 1 }) },
        { id: "mono_robo", name: "Робо-Моноліт", description: "Кожен постріл подвійний, швидкість +20%, пірс +2.", cost: 9900, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.80, alwaysDouble: true, pierce: (s.pierce || 1) + 2 }) }
      ],
      path3: [
        { id: "mono_scope", name: "Кам'яне Око", description: "Дальність +30px.", cost: 420, effect: (s) => ({ ...s, range: s.range + 30 }) },
        { id: "mono_camo", name: "Радар Кар'єру", description: "Виявляє камуфляж, пірс +1.", cost: 900, effect: (s) => ({ ...s, camoDetection: true, pierce: (s.pierce || 1) + 1 }) },
        { id: "mono_knock", name: "Гравітаційний Удар", description: "10% шанс оглушити на 0.5с, дальність +20px.", cost: 2100, effect: (s) => ({ ...s, freezeChance: 0.10, range: s.range + 20 }) },
        { id: "mono_emp", name: "Кам'яний EMP", description: "20% оглушення, вимикає здібності.", cost: 4600, effect: (s) => ({ ...s, freezeChance: 0.20, freezeDurationBonus: 30, disableAbilities: true }) },
        { id: "mono_avatar", name: "Аватар Подро", description: "30% оглушення, +35 шкоди, камуфляж, здібності вимкнено.", cost: 9600, effect: (s) => ({ ...s, freezeChance: 0.30, freezeDurationBonus: 60, damage: s.damage + 35, camoDetection: true, disableAbilities: true }) }
      ]
    }
  }
};

export const ENEMY_CONFIGS: Record<string, EnemyConfig> = {
  ordinary: {
    name: "Звичайний Брат",
    hp: 22,
    speed: 1.2,
    reward: 2,
    damage: 5,
    color: "#94a3b8",
    borderColor: "#475569",
    radius: 14,
    description: "Базовий повільний ворог, без особливих скілів."
  },
  fast: {
    name: "Швидкий Брат",
    hp: 14,
    speed: 2.2,
    reward: 2,
    damage: 5,
    color: "#fbbf24",
    borderColor: "#d97706",
    radius: 12,
    description: "Дуже швидкий, створює тиск на перших секундах."
  },
  heavy: {
    name: "Товстий Брат",
    hp: 120,
    speed: 0.7,
    reward: 8,
    damage: 15,
    color: "#f87171",
    borderColor: "#dc2626",
    radius: 18,
    description: "Повільний здоровань. Тестує ваш DPS."
  },
  coat: {
    name: "Брат у Куртці",
    hp: 50,
    speed: 1.0,
    reward: 5,
    damage: 10,
    color: "#38bdf8",
    borderColor: "#0284c7",
    radius: 15,
    isArmored: true,
    description: "Носить панцир-куртку. Отримує на 50% менше шкоди від молотків."
  },
  infinix_brat: {
    name: "Інфінікс-Брат",
    hp: 70,
    speed: 1.3,
    reward: 8,
    damage: 12,
    color: "#c084fc",
    borderColor: "#7c3aed",
    radius: 14,
    isGlitching: true,
    description: "Має Infinix. Періодично лагає й телепортується на 45px вперед."
  },
  boss: {
    name: "Головний Брат",
    hp: 750,
    speed: 0.6,
    reward: 35,
    damage: 50,
    color: "#e11d48",
    borderColor: "#4c0519",
    radius: 24,
    description: "Міні-бос братви. При смерті розсипається на 3 Швидких та 2 Братів у Куртці.",
    onDeath: (x, y, spawnEnemyCallback) => {
      // Spawn 3 fast and 2 coat
      for (let i = 0; i < 3; i++) {
        spawnEnemyCallback("fast", x - 10 + i * 10, y);
      }
      for (let i = 0; i < 2; i++) {
        spawnEnemyCallback("coat", x - 5 + i * 10, y);
      }
    }
  },
  rachky_brat: {
    name: "Рачковий Брат",
    hp: 40,
    speed: 1.1,
    reward: 3,
    damage: 8,
    color: "#fda4af",
    borderColor: "#e11d48",
    radius: 13,
    isSpawningTrail: true,
    description: "Залишає пил від цукерок, що прискорює інших братів на 40%."
  },
  gas_brat: {
    name: "Газовий Брат",
    hp: 80,
    speed: 0.9,
    reward: 4,
    damage: 10,
    color: "#86efac",
    borderColor: "#16a34a",
    radius: 15,
    isSlowingTowers: true,
    description: "Поширює неприємний запах, уповільнюючи атаку веж поруч на 40%."
  },
  granite: {
    name: "Гранітний Брат",
    hp: 180,
    speed: 0.4,
    reward: 15,
    damage: 20,
    color: "#6b7280",
    borderColor: "#1f2937",
    radius: 17,
    isSuperArmored: true,
    description: "З Коростишева. Броня знижує фізичну шкоду від молотків на 75%."
  },
  camo: {
    name: "Камуфляжний Брат",
    hp: 25,
    speed: 1.5,
    reward: 4,
    damage: 8,
    color: "#065f46",
    borderColor: "#022c22",
    radius: 13,
    isCamo: true,
    description: "Невидимий для більшості веж без сканера або орлиного ока."
  },
  regen: {
    name: "Регенеративний Брат",
    hp: 35,
    speed: 1.0,
    reward: 4,
    damage: 10,
    color: "#db2777",
    borderColor: "#831843",
    radius: 14,
    isRegen: true,
    description: "Постійно регенерує здоров'я, якщо не заморожений."
  },
  lead: {
    name: "Свинцевий Брат",
    hp: 60,
    speed: 0.6,
    reward: 6,
    damage: 12,
    color: "#4b5563",
    borderColor: "#1f2937",
    radius: 16,
    isLead: true,
    description: "Повністю імунний до молотків. Вразливий до кави, цукерок та газу."
  },
  phantom: {
    name: "Брат-Фантом",
    hp: 40,
    speed: 1.6,
    reward: 8,
    damage: 10,
    color: "#1e293b",
    borderColor: "#0f172a",
    radius: 13,
    isCamo: true,
    isPhantomCamo: true,
    description: "Супер-камуфляж. Видимий лише для веж з покращеним виявленням (Tier 2+)."
  },
  exploder: {
    name: "Вибуховий Брат",
    hp: 45,
    speed: 1.2,
    reward: 7,
    damage: 8,
    color: "#f97316",
    borderColor: "#c2410c",
    radius: 14,
    isExploder: true,
    description: "При смерті оглушує всі вежі в радіусі 80px на 1.5 секунди."
  },
  jumper: {
    name: "Брат-Стрибунець",
    hp: 55,
    speed: 1.0,
    reward: 9,
    damage: 12,
    color: "#7c3aed",
    borderColor: "#5b21b6",
    radius: 14,
    isGlitching: true,
    glitchDistance: 100,
    description: "Телепортується на 100px вперед кожні 3 секунди. Потужніший за Інфінікс-Брата."
  },
  shielded: {
    name: "Брат зі Щитом",
    hp: 60,
    speed: 0.8,
    reward: 12,
    damage: 15,
    color: "#0ea5e9",
    borderColor: "#0284c7",
    radius: 16,
    shieldHp: 80,
    shieldRegenDelay: 360,
    description: "Має щит на 80 HP. Щит регенерує через 6 секунд після знищення."
  },
  healer: {
    name: "Брат-Цілитель",
    hp: 60,
    speed: 0.8,
    reward: 10,
    damage: 10,
    color: "#4ade80",
    borderColor: "#16a34a",
    radius: 15,
    isHealer: true,
    description: "Лікує сусідніх ворогів на 3 HP/с. Пріоритетна ціль!"
  },
  megaboss: {
    name: "Мега-Бос",
    hp: 3000,
    speed: 0.4,
    reward: 100,
    damage: 100,
    color: "#dc2626",
    borderColor: "#450a0a",
    radius: 30,
    description: "Гігантський бос. При смерті породжує 2 Головних Братів та 5 Гранітних.",
    onDeath: (x, y, spawnEnemyCallback) => {
      for (let i = 0; i < 2; i++) spawnEnemyCallback("boss", x - 15 + i * 30, y);
      for (let i = 0; i < 5; i++) spawnEnemyCallback("granite", x - 20 + i * 10, y);
    }
  }
};

export interface WaveSegment {
  type: string;
  count: number;
  spawnDelay: number; // in milliseconds
  delayBeforeNext?: number; // wait before spawning next segment in same wave
}

export const WAVES: WaveSegment[][] = [
  // === WAVE 1-3: ordinary + fast only ===
  // Wave 1: Intro
  [
    { type: "ordinary", count: 18, spawnDelay: 1300 }
  ],
  // Wave 2: A few more ordinary
  [
    { type: "ordinary", count: 22, spawnDelay: 1000 }
  ],
  // Wave 3: Fast intro
  [
    { type: "ordinary", count: 18, spawnDelay: 1000, delayBeforeNext: 1500 },
    { type: "fast", count: 6, spawnDelay: 900 }
  ],
  // === WAVE 4: HEAVY intro ===
  // Wave 4: First Heavy Brat
  [
    { type: "ordinary", count: 18, spawnDelay: 1000, delayBeforeNext: 1200 },
    { type: "heavy", count: 5, spawnDelay: 3000 }
  ],
  // Wave 5: Heavy + fast pressure
  [
    { type: "fast", count: 20, spawnDelay: 500, delayBeforeNext: 1000 },
    { type: "heavy", count: 6, spawnDelay: 2800 }
  ],
  // Wave 6: Mixed
  [
    { type: "ordinary", count: 20, spawnDelay: 800, delayBeforeNext: 800 },
    { type: "fast", count: 15, spawnDelay: 600, delayBeforeNext: 800 },
    { type: "heavy", count: 5, spawnDelay: 2500 }
  ],
  // Wave 7: Heavy wall
  [
    { type: "ordinary", count: 15, spawnDelay: 900, delayBeforeNext: 1200 },
    { type: "heavy", count: 10, spawnDelay: 2200 }
  ],
  // === WAVE 8: COAT (armored) intro ===
  // Wave 8: First Coat
  [
    { type: "ordinary", count: 18, spawnDelay: 900, delayBeforeNext: 1200 },
    { type: "coat", count: 8, spawnDelay: 1800 }
  ],
  // Wave 9: Coat + heavy
  [
    { type: "heavy", count: 8, spawnDelay: 2000, delayBeforeNext: 1000 },
    { type: "coat", count: 10, spawnDelay: 1500 }
  ],
  // Wave 10: Armored rush
  [
    { type: "fast", count: 20, spawnDelay: 500, delayBeforeNext: 800 },
    { type: "coat", count: 12, spawnDelay: 1400, delayBeforeNext: 800 },
    { type: "ordinary", count: 15, spawnDelay: 800 }
  ],
  // Wave 11: Heavy armor
  [
    { type: "heavy", count: 10, spawnDelay: 1800, delayBeforeNext: 1000 },
    { type: "coat", count: 12, spawnDelay: 1500, delayBeforeNext: 800 },
    { type: "fast", count: 18, spawnDelay: 500 }
  ],
  // === WAVE 12-15: Heavy/Coat pressure ===
  // Wave 12: Heavy + fast pressure
  [
    { type: "heavy", count: 6, spawnDelay: 2200, delayBeforeNext: 1200 },
    { type: "fast", count: 18, spawnDelay: 500 }
  ],
  // Wave 13: Coat + ordinary
  [
    { type: "ordinary", count: 22, spawnDelay: 800, delayBeforeNext: 1000 },
    { type: "coat", count: 10, spawnDelay: 1300, delayBeforeNext: 800 },
    { type: "fast", count: 12, spawnDelay: 600 }
  ],
  // Wave 14: Heavy + lead
  [
    { type: "heavy", count: 8, spawnDelay: 1800, delayBeforeNext: 1000 },
    { type: "lead", count: 6, spawnDelay: 2000, delayBeforeNext: 800 },
    { type: "ordinary", count: 18, spawnDelay: 800 }
  ],
  // Wave 15: Coat + fast pressure
  [
    { type: "coat", count: 14, spawnDelay: 1200, delayBeforeNext: 1000 },
    { type: "heavy", count: 6, spawnDelay: 2000, delayBeforeNext: 800 },
    { type: "fast", count: 22, spawnDelay: 400 }
  ],
  // === WAVE 16: LEAD intro ===
  // Wave 16: First Lead
  [
    { type: "lead", count: 8, spawnDelay: 2000, delayBeforeNext: 1200 },
    { type: "ordinary", count: 20, spawnDelay: 800 }
  ],
  // Wave 17: Lead + heavy
  [
    { type: "heavy", count: 10, spawnDelay: 1500, delayBeforeNext: 1000 },
    { type: "lead", count: 10, spawnDelay: 1800, delayBeforeNext: 800 },
    { type: "fast", count: 18, spawnDelay: 500 }
  ],
  // Wave 18: Lead + heavy + coat
  [
    { type: "lead", count: 10, spawnDelay: 1600, delayBeforeNext: 1000 },
    { type: "heavy", count: 8, spawnDelay: 2000, delayBeforeNext: 800 },
    { type: "coat", count: 10, spawnDelay: 1400 }
  ],
  // Wave 19: Mixed armor
  [
    { type: "lead", count: 12, spawnDelay: 1400, delayBeforeNext: 800 },
    { type: "heavy", count: 10, spawnDelay: 1500, delayBeforeNext: 800 },
    { type: "coat", count: 14, spawnDelay: 1200, delayBeforeNext: 800 },
    { type: "fast", count: 20, spawnDelay: 450 }
  ],
  // === WAVE 20: INFINIX_BRAT + CAMO intro ===
  // Wave 20: First Infinix Brat + First Camo
  [
    { type: "infinix_brat", count: 8, spawnDelay: 1500, delayBeforeNext: 1200 },
    { type: "camo", count: 8, spawnDelay: 1500, delayBeforeNext: 1000 },
    { type: "coat", count: 10, spawnDelay: 1400, delayBeforeNext: 800 },
    { type: "fast", count: 15, spawnDelay: 500 }
  ],
  // Wave 21: Infinix + camo
  [
    { type: "infinix_brat", count: 10, spawnDelay: 1300, delayBeforeNext: 1000 },
    { type: "camo", count: 15, spawnDelay: 1000, delayBeforeNext: 800 },
    { type: "lead", count: 8, spawnDelay: 1800 }
  ],
  // Wave 22: Infinix + heavy
  [
    { type: "heavy", count: 10, spawnDelay: 1800, delayBeforeNext: 1000 },
    { type: "infinix_brat", count: 12, spawnDelay: 1200, delayBeforeNext: 800 },
    { type: "ordinary", count: 20, spawnDelay: 700 }
  ],
  // Wave 23: Glitch chaos
  [
    { type: "infinix_brat", count: 15, spawnDelay: 1000, delayBeforeNext: 800 },
    { type: "camo", count: 12, spawnDelay: 1100, delayBeforeNext: 800 },
    { type: "lead", count: 10, spawnDelay: 1500, delayBeforeNext: 800 },
    { type: "fast", count: 20, spawnDelay: 450 }
  ],
  // === WAVE 24: REGEN intro ===
  // Wave 24: First Regen
  [
    { type: "regen", count: 10, spawnDelay: 1300, delayBeforeNext: 1200 },
    { type: "fast", count: 20, spawnDelay: 500 }
  ],
  // Wave 25: Regen + camo
  [
    { type: "camo", count: 15, spawnDelay: 1000, delayBeforeNext: 1000 },
    { type: "regen", count: 12, spawnDelay: 1100, delayBeforeNext: 800 },
    { type: "coat", count: 10, spawnDelay: 1400 }
  ],
  // Wave 26: Regen + infinix
  [
    { type: "infinix_brat", count: 12, spawnDelay: 1200, delayBeforeNext: 1000 },
    { type: "regen", count: 15, spawnDelay: 1000, delayBeforeNext: 800 },
    { type: "lead", count: 10, spawnDelay: 1500 }
  ],
  // Wave 27: Regen wall
  [
    { type: "regen", count: 20, spawnDelay: 800, delayBeforeNext: 800 },
    { type: "heavy", count: 10, spawnDelay: 1800, delayBeforeNext: 800 },
    { type: "camo", count: 12, spawnDelay: 1000, delayBeforeNext: 800 },
    { type: "infinix_brat", count: 10, spawnDelay: 1200 }
  ],
  // === WAVE 28: RACHKY + GAS (support) intro ===
  // Wave 28: First support enemies
  [
    { type: "rachky_brat", count: 12, spawnDelay: 1000, delayBeforeNext: 1000 },
    { type: "gas_brat", count: 10, spawnDelay: 1200, delayBeforeNext: 800 },
    { type: "healer", count: 6, spawnDelay: 1500, delayBeforeNext: 800 },
    { type: "fast", count: 20, spawnDelay: 450 }
  ],
  // Wave 29: Support + armor
  [
    { type: "coat", count: 12, spawnDelay: 1300, delayBeforeNext: 800 },
    { type: "rachky_brat", count: 15, spawnDelay: 800, delayBeforeNext: 800 },
    { type: "gas_brat", count: 12, spawnDelay: 1000, delayBeforeNext: 800 },
    { type: "lead", count: 10, spawnDelay: 1500 }
  ],
  // Wave 30: Support + regen
  [
    { type: "regen", count: 18, spawnDelay: 900, delayBeforeNext: 800 },
    { type: "rachky_brat", count: 15, spawnDelay: 800, delayBeforeNext: 800 },
    { type: "gas_brat", count: 15, spawnDelay: 900, delayBeforeNext: 800 },
    { type: "infinix_brat", count: 12, spawnDelay: 1100 }
  ],
  // Wave 31: Support chaos
  [
    { type: "rachky_brat", count: 14, spawnDelay: 750, delayBeforeNext: 600 },
    { type: "gas_brat", count: 12, spawnDelay: 950, delayBeforeNext: 600 },
    { type: "camo", count: 14, spawnDelay: 850, delayBeforeNext: 600 },
    { type: "lead", count: 9, spawnDelay: 1250, delayBeforeNext: 600 },
    { type: "regen", count: 12, spawnDelay: 950 }
  ],
  // === WAVE 32: GRANITE + PHANTOM + EXPLODER intro ===
  // Wave 32: First Granite + Phantom + Exploder
  [
    { type: "granite", count: 8, spawnDelay: 2000, delayBeforeNext: 1000 },
    { type: "phantom", count: 6, spawnDelay: 1500, delayBeforeNext: 1000 },
    { type: "exploder", count: 5, spawnDelay: 1800 }
  ],
  // Wave 33: Granite wall + camo
  [
    { type: "granite", count: 10, spawnDelay: 1800, delayBeforeNext: 800 },
    { type: "camo", count: 18, spawnDelay: 800, delayBeforeNext: 800 },
    { type: "phantom", count: 8, spawnDelay: 1300, delayBeforeNext: 800 },
    { type: "fast", count: 25, spawnDelay: 400 }
  ],
  // Wave 34: Exploder + regen
  [
    { type: "exploder", count: 8, spawnDelay: 1500, delayBeforeNext: 800 },
    { type: "regen", count: 20, spawnDelay: 800, delayBeforeNext: 800 },
    { type: "granite", count: 8, spawnDelay: 2000, delayBeforeNext: 800 },
    { type: "infinix_brat", count: 12, spawnDelay: 1100 }
  ],
  // Wave 35: Granite + phantom + lead
  [
    { type: "granite", count: 12, spawnDelay: 1600, delayBeforeNext: 800 },
    { type: "phantom", count: 10, spawnDelay: 1200, delayBeforeNext: 800 },
    { type: "lead", count: 15, spawnDelay: 1200, delayBeforeNext: 800 },
    { type: "exploder", count: 6, spawnDelay: 1600, delayBeforeNext: 800 },
    { type: "healer", count: 8, spawnDelay: 1200, delayBeforeNext: 800 },
    { type: "coat", count: 12, spawnDelay: 1300 }
  ],
  // === WAVE 36: JUMPER + SHIELDED intro ===
  // Wave 36: First Jumper + Shielded
  [
    { type: "jumper", count: 6, spawnDelay: 1800, delayBeforeNext: 1000 },
    { type: "shielded", count: 6, spawnDelay: 1800, delayBeforeNext: 1000 },
    { type: "granite", count: 8, spawnDelay: 2000, delayBeforeNext: 800 },
    { type: "regen", count: 15, spawnDelay: 900 }
  ],
  // Wave 37: Jumper + camo + phantom
  [
    { type: "jumper", count: 8, spawnDelay: 1500, delayBeforeNext: 800 },
    { type: "phantom", count: 12, spawnDelay: 1100, delayBeforeNext: 800 },
    { type: "camo", count: 20, spawnDelay: 700, delayBeforeNext: 800 },
    { type: "shielded", count: 8, spawnDelay: 1500, delayBeforeNext: 800 },
    { type: "fast", count: 25, spawnDelay: 400 }
  ],
  // Wave 38: Shielded wall + support
  [
    { type: "shielded", count: 12, spawnDelay: 1300, delayBeforeNext: 800 },
    { type: "rachky_brat", count: 18, spawnDelay: 700, delayBeforeNext: 600 },
    { type: "gas_brat", count: 15, spawnDelay: 900, delayBeforeNext: 600 },
    { type: "jumper", count: 10, spawnDelay: 1300, delayBeforeNext: 800 },
    { type: "exploder", count: 8, spawnDelay: 1400 }
  ],
  // Wave 39: Everything mixed - penultimate
  [
    { type: "granite", count: 15, spawnDelay: 1400, delayBeforeNext: 600 },
    { type: "infinix_brat", count: 18, spawnDelay: 900, delayBeforeNext: 600 },
    { type: "phantom", count: 15, spawnDelay: 1000, delayBeforeNext: 600 },
    { type: "shielded", count: 12, spawnDelay: 1200, delayBeforeNext: 600 },
    { type: "jumper", count: 12, spawnDelay: 1200, delayBeforeNext: 600 },
    { type: "regen", count: 20, spawnDelay: 700, delayBeforeNext: 600 },
    { type: "lead", count: 15, spawnDelay: 1100 }
  ],
  // === WAVE 40: THE ULTIMATE FINAL WAVE ===
  // Wave 40: Boss + Megaboss + everything
  [
    { type: "boss", count: 2, spawnDelay: 3000, delayBeforeNext: 1500 },
    { type: "megaboss", count: 1, spawnDelay: 5000, delayBeforeNext: 1000 },
    { type: "granite", count: 16, spawnDelay: 950, delayBeforeNext: 600 },
    { type: "infinix_brat", count: 16, spawnDelay: 850, delayBeforeNext: 600 },
    { type: "camo", count: 20, spawnDelay: 550, delayBeforeNext: 500 },
    { type: "lead", count: 16, spawnDelay: 850, delayBeforeNext: 500 },
    { type: "regen", count: 20, spawnDelay: 650, delayBeforeNext: 500 },
    { type: "phantom", count: 12, spawnDelay: 950, delayBeforeNext: 500 },
    { type: "exploder", count: 8, spawnDelay: 1250, delayBeforeNext: 500 },
    { type: "shielded", count: 12, spawnDelay: 1050, delayBeforeNext: 500 },
    { type: "healer", count: 8, spawnDelay: 1050, delayBeforeNext: 500 },
    { type: "jumper", count: 12, spawnDelay: 1050 }
  ],
  // === COMBO WAVES 41-46: Synergy enemy combinations ===
  // Wave 41: COMBO - Camo+Lead (невидимі + імунні до молотків)
  [
    { type: "camo", count: 25, spawnDelay: 600, delayBeforeNext: 600 },
    { type: "lead", count: 20, spawnDelay: 800, delayBeforeNext: 600 },
    { type: "camo", count: 15, spawnDelay: 500, delayBeforeNext: 600 },
    { type: "lead", count: 15, spawnDelay: 700, delayBeforeNext: 600 },
    { type: "phantom", count: 10, spawnDelay: 1000, delayBeforeNext: 600 },
    { type: "fast", count: 30, spawnDelay: 350 }
  ],
  // Wave 42: COMBO - Regen+Phantom (регенерація + супер-камуфляж)
  [
    { type: "regen", count: 25, spawnDelay: 700, delayBeforeNext: 600 },
    { type: "phantom", count: 15, spawnDelay: 1000, delayBeforeNext: 600 },
    { type: "regen", count: 20, spawnDelay: 600, delayBeforeNext: 600 },
    { type: "phantom", count: 12, spawnDelay: 900, delayBeforeNext: 600 },
    { type: "camo", count: 20, spawnDelay: 600, delayBeforeNext: 600 },
    { type: "infinix_brat", count: 15, spawnDelay: 900 }
  ],
  // Wave 43: COMBO - Shielded+Exploder (щит + вибух при смерті)
  [
    { type: "shielded", count: 15, spawnDelay: 1200, delayBeforeNext: 600 },
    { type: "exploder", count: 12, spawnDelay: 1200, delayBeforeNext: 600 },
    { type: "shielded", count: 12, spawnDelay: 1000, delayBeforeNext: 600 },
    { type: "exploder", count: 10, spawnDelay: 1100, delayBeforeNext: 600 },
    { type: "rachky_brat", count: 20, spawnDelay: 600, delayBeforeNext: 500 },
    { type: "gas_brat", count: 15, spawnDelay: 800, delayBeforeNext: 500 },
    { type: "granite", count: 10, spawnDelay: 1500 }
  ],
  // Wave 44: COMBO - Granite+Lead (подвійна броня)
  [
    { type: "granite", count: 15, spawnDelay: 1450, delayBeforeNext: 600 },
    { type: "lead", count: 18, spawnDelay: 950, delayBeforeNext: 600 },
    { type: "granite", count: 10, spawnDelay: 1250, delayBeforeNext: 600 },
    { type: "lead", count: 12, spawnDelay: 850, delayBeforeNext: 600 },
    { type: "coat", count: 12, spawnDelay: 1050, delayBeforeNext: 600 },
    { type: "heavy", count: 10, spawnDelay: 1550, delayBeforeNext: 600 },
    { type: "shielded", count: 8, spawnDelay: 1250 }
  ],
  // Wave 45: COMBO - Jumper+Regen (телепорт + регенерація)
  [
    { type: "jumper", count: 12, spawnDelay: 1200, delayBeforeNext: 600 },
    { type: "regen", count: 25, spawnDelay: 700, delayBeforeNext: 600 },
    { type: "jumper", count: 10, spawnDelay: 1100, delayBeforeNext: 600 },
    { type: "regen", count: 20, spawnDelay: 600, delayBeforeNext: 600 },
    { type: "infinix_brat", count: 15, spawnDelay: 900, delayBeforeNext: 600 },
    { type: "phantom", count: 12, spawnDelay: 1000, delayBeforeNext: 600 },
    { type: "rachky_brat", count: 18, spawnDelay: 700 }
  ],
  // Wave 46: COMBO ULTIMATE - All synergies combined
  [
    { type: "boss", count: 2, spawnDelay: 3000, delayBeforeNext: 1200 },
    { type: "megaboss", count: 1, spawnDelay: 5000, delayBeforeNext: 800 },
    { type: "camo", count: 16, spawnDelay: 550, delayBeforeNext: 400 },
    { type: "lead", count: 14, spawnDelay: 750, delayBeforeNext: 400 },
    { type: "phantom", count: 10, spawnDelay: 950, delayBeforeNext: 400 },
    { type: "regen", count: 16, spawnDelay: 650, delayBeforeNext: 400 },
    { type: "shielded", count: 12, spawnDelay: 1050, delayBeforeNext: 400 },
    { type: "exploder", count: 8, spawnDelay: 1150, delayBeforeNext: 400 },
    { type: "granite", count: 12, spawnDelay: 1250, delayBeforeNext: 400 },
    { type: "jumper", count: 10, spawnDelay: 1050, delayBeforeNext: 400 },
    { type: "infinix_brat", count: 14, spawnDelay: 850, delayBeforeNext: 400 },
    { type: "rachky_brat", count: 16, spawnDelay: 650, delayBeforeNext: 400 },
    { type: "gas_brat", count: 12, spawnDelay: 850 }
  ]
];

export const POST_46_WAVES: WaveSegment[][] = [
  [
    { type: "phantom", count: 14, spawnDelay: 850, delayBeforeNext: 500 },
    { type: "lead", count: 16, spawnDelay: 700, delayBeforeNext: 500 },
    { type: "camo", count: 24, spawnDelay: 450 }
  ],
  [
    { type: "shielded", count: 14, spawnDelay: 950, delayBeforeNext: 500 },
    { type: "exploder", count: 12, spawnDelay: 1000, delayBeforeNext: 500 },
    { type: "gas_brat", count: 14, spawnDelay: 750 }
  ],
  [
    { type: "jumper", count: 16, spawnDelay: 850, delayBeforeNext: 500 },
    { type: "regen", count: 26, spawnDelay: 550, delayBeforeNext: 500 },
    { type: "healer", count: 8, spawnDelay: 1100 }
  ],
  [
    { type: "granite", count: 16, spawnDelay: 1200, delayBeforeNext: 500 },
    { type: "coat", count: 18, spawnDelay: 800, delayBeforeNext: 500 },
    { type: "boss", count: 2, spawnDelay: 2600 }
  ],
  [
    { type: "megaboss", count: 1, spawnDelay: 4800, delayBeforeNext: 500 },
    { type: "shielded", count: 16, spawnDelay: 900, delayBeforeNext: 500 },
    { type: "phantom", count: 14, spawnDelay: 850 }
  ],
  [
    { type: "rachky_brat", count: 26, spawnDelay: 500, delayBeforeNext: 400 },
    { type: "fast", count: 36, spawnDelay: 300, delayBeforeNext: 400 },
    { type: "jumper", count: 14, spawnDelay: 800 }
  ],
  [
    { type: "lead", count: 22, spawnDelay: 650, delayBeforeNext: 400 },
    { type: "granite", count: 18, spawnDelay: 1000, delayBeforeNext: 400 },
    { type: "exploder", count: 12, spawnDelay: 900 }
  ],
  [
    { type: "healer", count: 10, spawnDelay: 900, delayBeforeNext: 400 },
    { type: "regen", count: 32, spawnDelay: 450, delayBeforeNext: 400 },
    { type: "infinix_brat", count: 20, spawnDelay: 650 }
  ],
  [
    { type: "boss", count: 3, spawnDelay: 2400, delayBeforeNext: 500 },
    { type: "shielded", count: 18, spawnDelay: 800, delayBeforeNext: 400 },
    { type: "phantom", count: 18, spawnDelay: 750, delayBeforeNext: 400 },
    { type: "jumper", count: 16, spawnDelay: 750 }
  ],
  [
    { type: "megaboss", count: 2, spawnDelay: 4500, delayBeforeNext: 500 },
    { type: "granite", count: 20, spawnDelay: 850, delayBeforeNext: 400 },
    { type: "lead", count: 20, spawnDelay: 600, delayBeforeNext: 400 },
    { type: "healer", count: 12, spawnDelay: 900 }
  ]
];

const GLOBAL_WAVE_ENEMY_COUNT_MULTIPLIER = 1.5;

// BTD-style wave scaling: more simple enemies, fewer MOAB-style elites.
// Applied on top of the handcrafted WAVES / POST_46_WAVES definitions.
function getWaveScaling(waveNumber: number, type: string): { countMult: number; delayMult: number } {
  const swarm = ["ordinary", "fast"];
  const massSpecial = ["camo", "regen", "rachky_brat", "gas_brat"];
  const armored = ["coat", "heavy", "lead"];
  const miniBoss = ["infinix_brat", "granite", "phantom", "exploder", "jumper", "shielded", "healer"];

  // Early waves should have large spacing between enemies; later waves tighten up.
  const swarmDelay = waveNumber <= 5 ? 1.15 : waveNumber <= 10 ? 1.0 : waveNumber <= 25 ? 0.7 : 0.55;
  const specialDelay = waveNumber <= 5 ? 1.1 : waveNumber <= 10 ? 1.0 : waveNumber <= 25 ? 0.8 : 0.65;
  const armoredDelay = waveNumber <= 10 ? 1.0 : waveNumber <= 25 ? 0.9 : 0.75;
  const miniBossDelay = waveNumber <= 10 ? 1.0 : 0.9;

  if (swarm.includes(type)) {
    return { countMult: 1.4 + waveNumber * 0.045, delayMult: swarmDelay };
  }
  if (massSpecial.includes(type)) {
    return { countMult: 1.15 + waveNumber * 0.03, delayMult: specialDelay };
  }
  if (armored.includes(type)) {
    return { countMult: 1.05 + waveNumber * 0.02, delayMult: armoredDelay };
  }
  if (miniBoss.includes(type)) {
    return { countMult: 1.0 + waveNumber * 0.008, delayMult: miniBossDelay };
  }
  // boss / megaboss: keep counts rare
  return { countMult: 1.0, delayMult: 1.0 };
}

function scaleWaveSegments(segments: WaveSegment[], waveNumber: number): WaveSegment[] {
  return segments.map((seg) => {
    const scaling = getWaveScaling(waveNumber, seg.type);
    return {
      ...seg,
      count: Math.max(1, Math.ceil(seg.count * scaling.countMult * GLOBAL_WAVE_ENEMY_COUNT_MULTIPLIER)),
      spawnDelay: Math.max(150, Math.floor(seg.spawnDelay * scaling.delayMult))
    };
  });
}

export function getScaledWave(waveNumber: number): WaveSegment[] {
  let baseSegments: WaveSegment[];
  if (waveNumber <= 46) {
    baseSegments = WAVES[waveNumber - 1];
  } else if (waveNumber <= 56) {
    baseSegments = POST_46_WAVES[waveNumber - 47];
  } else {
    // Endless mode after the handcrafted post-game set.
    const multiplier = Math.pow(1.06, waveNumber - 56);
    const types = ["ordinary", "fast", "heavy", "coat", "infinix_brat", "rachky_brat", "gas_brat", "granite", "camo", "regen", "lead", "phantom", "exploder", "jumper", "shielded", "healer"];
    baseSegments = [];

    // Bosses every 5 waves
    if (waveNumber % 5 === 0) {
      const bossCount = Math.floor((waveNumber - 56) / 8) + 1;
      baseSegments.push({ type: "boss", count: bossCount, spawnDelay: 3500, delayBeforeNext: 2000 });
    }

    // Megaboss every 12 waves
    if (waveNumber % 12 === 0) {
      baseSegments.push({ type: "megaboss", count: 1, spawnDelay: 5000, delayBeforeNext: 2000 });
    }

    // 5-7 random segments (slower growth)
    const segmentCount = 5 + Math.min(7, Math.floor((waveNumber - 56) / 4));
    for (let i = 0; i < segmentCount; i++) {
      const randomType = types[Math.floor(Math.random() * types.length)];
      const baseCount = randomType === "granite" || randomType === "heavy" ? 4 : 10;
      const count = Math.floor(baseCount * Math.sqrt(multiplier));
      const delay = Math.max(250, Math.floor(1000 / (1 + (waveNumber - 56) * 0.05)));
      baseSegments.push({
        type: randomType,
        count: count > 0 ? count : 1,
        spawnDelay: delay,
        delayBeforeNext: 800
      });
    }
  }

  return scaleWaveSegments(baseSegments, waveNumber);
}

export function getEnemyStatsForWave(type: string, waveNumber: number): EnemyConfig {
  const base = ENEMY_CONFIGS[type];
  if (!base) return ENEMY_CONFIGS.ordinary;

  const tier = getTierForWave(waveNumber);
  const tierData = TIER_SCALING[tier - 1];

  // Apply tier scaling
  let hp = Math.floor(base.hp * tierData.hpMult);
  let speed = base.speed * tierData.speedMult;
  let reward = Math.floor(base.reward * tierData.rewardMult);
  let isArmored = base.isArmored;
  let isSuperArmored = base.isSuperArmored;
  let isRegen = base.isRegen;
  let isLead = base.isLead;

  // Tier inheritance: higher tiers gain abilities
  if (tierData.inheritsRegen && !isRegen) {
    isRegen = true;
  }
  if (tierData.inheritsArmor && !isArmored && !isSuperArmored) {
    isArmored = true;
  }
  if (tierData.inheritsLead && !isLead) {
    isLead = true;
  }

  // Endless mode (after wave 46): additional scaling on top of tier
  if (waveNumber > 56) {
    const endlessMult = Math.pow(1.06, waveNumber - 56);
    const endlessSpeed = Math.min(1.4, Math.pow(1.012, waveNumber - 56));
    hp = Math.floor(hp * endlessMult);
    speed = speed * endlessSpeed;
    reward = Math.floor(reward * Math.pow(1.02, waveNumber - 56));
  }

  return {
    ...base,
    hp,
    speed,
    reward,
    isArmored,
    isSuperArmored,
    isRegen,
    isLead,
    tier,
    shieldHp: base.shieldHp ? Math.max(40, Math.floor(base.shieldHp * (waveNumber > 56 ? Math.pow(1.06, waveNumber - 56) : 1) * tierData.hpMult)) : undefined,
  };
}

// Shared emoji map for enemies and towers.
export const EMOJI_MAP: Record<string, string> = {
  ordinary: "😐", fast: "⚡", heavy: "🍔", coat: "🧥",
  infinix_brat: "👾", boss: "💀", rachky_brat: "🍬", gas_brat: "💨", granite: "🗿",
  camo: "🦹", regen: "💗", lead: "🔩",
  phantom: "👻", exploder: "💣", jumper: "🦘", shielded: "🛡️", megaboss: "👹",
  sniper: "🎯", chain: "⚡", kladmen: "💣", healer: "💚", bankomat: "🏧", monolith: "🗿"
};

// Shared sound map. All sounds use the same PDR Production sample with different volumes.
export const SOUND_MAP: Record<string, { file: string; volume: number }> = {
  hammer: { file: "/PDR_PRODUCTION_SOUND.mp3", volume: 0.35 },
  coffee: { file: "/PDR_PRODUCTION_SOUND.mp3", volume: 0.2 },
  candy: { file: "/PDR_PRODUCTION_SOUND.mp3", volume: 0.3 },
  infinix: { file: "/PDR_PRODUCTION_SOUND.mp3", volume: 0.4 },
  gas: { file: "/PDR_PRODUCTION_SOUND.mp3", volume: 0.15 },
  sniper: { file: "/PDR_PRODUCTION_SOUND.mp3", volume: 0.5 },
  chain: { file: "/PDR_PRODUCTION_SOUND.mp3", volume: 0.35 },
  kladmen: { file: "/PDR_PRODUCTION_SOUND.mp3", volume: 0.4 },
  bankomat: { file: "/PDR_PRODUCTION_SOUND.mp3", volume: 0.18 },
  monolith: { file: "/PDR_PRODUCTION_SOUND.mp3", volume: 0.55 },
  wave: { file: "/PDR_PRODUCTION_SOUND.mp3", volume: 0.22 },
  crit: { file: "/PDR_PRODUCTION_SOUND.mp3", volume: 0.5 },
  explosion: { file: "/PDR_PRODUCTION_SOUND.mp3", volume: 0.45 },
};

// Returns a random wave announcement quote for the given wave number.
export function getWaveQuote(wave: number): string {
  const quotes = [
    `Накат братви #${wave}! Вони йдуть за Nescafe!`,
    `Хвиля ${wave}: Братва проривається! Подро почув!`,
    `Хвиля ${wave}: Рачки активовано, викладачі в шоці!`,
    `Хвиля ${wave}: Infinix-брати почали лагати реальність.`,
    `Хвиля ${wave}: Коростишівський граніт тремтить від страху.`,
    `Хвиля ${wave}: Подро мовчить, але молотки говорять за нього.`,
    `Хвиля ${wave}: Братва вийшла з під'їзду. Серйозні обличчя.`,
    `Хвиля ${wave}: Nescafe Gold закінчується! Тримай оборону!`,
    `Хвиля ${wave}: Хтось викликав таксі, але прийшла братва.`,
    `Хвиля ${wave}: Молотки летять, рачки святять, кава парує.`,
    `Хвиля ${wave}: Братва: "Подро, вийди!". Подро: "Ні".`,
    `Хвиля ${wave}: Сьогодні братва в формі. Тренувались у підвалі.`,
    `Хвиля ${wave}: Викладачка дала ДЗ, а братва — дубинку.`,
    `Хвиля ${wave}: Братва знайшла новий маршрут через двір.`,
    `Хвиля ${wave}: Подро: "Я їх чув. Вони гучніші за мою тишу."`,
    `Хвиля ${wave}: Газова аура працює. Братва кашляє, але йде.`,
    `Хвиля ${wave}: Снайпер дрімає, але очі відкриті.`,
    `Хвиля ${wave}: Ланцюгова башня шокує братву. Буквально.`,
    `Хвиля ${wave}: Братва: "Де Подро?" Подро: "Тут." *кидає молоток*`,
    `Хвиля ${wave}: Сьогодні день відкритих дверей. Братва запрошується.`,
    `Хвиля ${wave}: Братва: "Ми з повагою." Подро: "Я з молотком."`,
    `Хвиля ${wave}: Братва: "Подро, давай поговоримо." Подро: *throw*`,
    `Хвиля ${wave}: Братва: "У нас є аргументи." Подро: "У мене є молот."`,
    `Хвиля ${wave}: Nescafe Gold — валюта майбутнього. Братва згодна.`,
    `Хвиля ${wave}: Братва: "Ми не здамось!" Подро: "Ок." *ще один молоток*`,
    `Хвиля ${wave}: Братва: "Подро, ти нас не зупиниш!" Подро: *triple crit*`,
    `Хвиля ${wave}: Рачки летять, братва падає. Класика.`,
    `Хвиля ${wave}: Братва: "Що це за звуки?" Подро: "PDR Production."`,
    `Хвиля ${wave}: Братва: "Ми прийшли з миром." Подро: "А я з молотком."`,
    `Хвиля ${wave}: Братва: "Подро, вийди з хати!" Подро: "Ні, я граю в TD."`,
    `Хвиля ${wave}: Братва: "У нас є план!" Подро: "У мене є 4 башні."`,
    `Хвиля ${wave}: Братва: "Ми вас оточили!" Подро: "Я вас бачу."`,
    `Хвиля ${wave}: Братва: "Здаємося!" Подро: "Занадто пізно."`,
    `Хвиля ${wave}: Братва: "Подро, поясни!" Подро: *throw* *throw* *throw*`,
    `Хвиля ${wave}: Братва: "Ми не боїмось!" Подро: "А ви повинні."`,
    `Хвиля ${wave}: Братва: "У нас є броня!" Подро: "У мене є кава."`,
    `Хвиля ${wave}: Братва: "Ми швидкі!" Подро: "А я точний."`,
    `Хвиля ${wave}: Братва: "Подро, ти сам?" Подро: "Ні, зі мною 10 башень."`,
    `Хвиля ${wave}: Братва: "Ми вас знайдемо!" Подро: "Я вас чекаю."`,
    `Хвиля ${wave}: Братва: "У нас є секрет!" Подро: "У мене є апгрейди."`,
    `Хвиля ${wave}: Братва: "Ми не здамось!" Подро: "Тоді тримай молоток."`,
    `Хвиля ${wave}: Братва: "Подро, поясни ситуацію!" Подро: "Молот. Рачки. Кава."`,
    `Хвиля ${wave}: Братва: "Ми прийшли за Nescafe!" Подро: "А я за перемогою."`,
    `Хвиля ${wave}: Братва: "У нас є числа!" Подро: "У мене є DPS."`,
    `Хвиля ${wave}: Братва: "Ми вас перехитримо!" Подро: "Спробуйте."`,
    `Хвиля ${wave}: Братва: "Здаємося!" Подро: "Пізно. Молоток уже летить."`,
    `Хвиля ${wave}: Братва: "У нас є стратегія!" Подро: "У мене є гача-пул."`,
    `Хвиля ${wave}: Братва: "Ми вас не боїмось!" Подро: "Ви повинні."`,
    `Хвиля ${wave}: Братва: "Подро, вийди з хати!" Подро: "Ні, у мене 200 FPS."`,
    `Хвиля ${wave}: Братва: "Ми прийшли з повагою." Подро: "А я з бронебійним."`,
    `Хвиля ${wave}: Братва: "У нас є план Б!" Подро: "У мене є план Молоток."`,
    `Хвиля ${wave}: Братва: "Подро, ти нас не зупиниш!" Подро: "Ок, тримай BSOD."`,
    `Хвиля ${wave}: Братва: "Ми вас оточили!" Подро: "Я вас бачу через 5G."`,
    `Хвиля ${wave}: Братва: "Здаємося!" Подро: "Ні. Я хочу score."`,
    `Хвиля ${wave}: Братва: "Подро, поясни!" Подро: "Все просто: молоток + кава = перемога."`,
    `Хвиля ${wave}: Братва: "Ми не боїмось!" Подро: "А ви повинні. У мене Тесла."`,
    `Хвиля ${wave}: Братва: "У нас є броня!" Подро: "У мене є Коростишівський Еліксир."`,
    `Хвиля ${wave}: Братва: "Ми швидкі!" Подро: "А я з ЕМП-імпульсом."`,
    `Хвиля ${wave}: Братва: "Подро, ти сам?" Подро: "Ні, зі мною Петр Хоменко."`,
    `Хвиля ${wave}: Братва: "Ми вас знайдемо!" Подро: "Я вас бачу через волхак."`,
    `Хвиля ${wave}: Братва: "У нас є секрет!" Подро: "У мене є One Shot One Kill."`,
    `Хвиля ${wave}: Братва: "Ми не здамось!" Подро: "Тоді тримай Тактичний Ядерний."`,
    `Хвиля ${wave}: Братва: "Подро, поясни ситуацію!" Подро: "Сингулярність. Просто дивись."`,
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}
