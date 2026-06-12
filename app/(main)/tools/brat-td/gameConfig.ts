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
}

export const TOWER_CONFIGS: Record<string, TowerConfig> = {
  hammer: {
    name: "Подро з Молотком",
    description: "Кидає молоток у найближчого брата. Базовий юніт.",
    cost: 100,
    range: 130,
    damage: 25,
    fireRate: 1.2,
    color: "#38bdf8", // Sky blue
    emoji: "🔨",
    upgrades: {
      path1: [
        { id: "hammer_sharp", name: "Гострий молоток", description: "Збільшує шкоду молотка на 5.", cost: 50, effect: (s) => ({ ...s, damage: s.damage + 5 }) },
        { id: "hammer_steel", name: "Сталеве гартування", description: "Збільшує шкоду молотка ще на 10.", cost: 90, effect: (s) => ({ ...s, damage: s.damage + 10 }) },
        { id: "hammer_heavy", name: "Важкий молоток", description: "Шкода +25, радіус +10, але атака на 25% повільніша.", cost: 180, effect: (s) => ({ ...s, damage: s.damage + 25, range: s.range + 10, fireRate: s.fireRate * 1.25 }) },
        { id: "hammer_breaker", name: "Руйнівник граніту", description: "Шкода +45. Молотки повністю ігнорують броню в куртці.", cost: 350, effect: (s) => ({ ...s, damage: s.damage + 45, ignoresArmor: true }) },
        { id: "hammer_thor", name: "Молот Тора ЗТ", description: "Велетенська шкода (+130) та збільшений радіус (+35).", cost: 1200, effect: (s) => ({ ...s, damage: s.damage + 130, range: s.range + 35 }) }
      ],
      path2: [
        { id: "hammer_fast", name: "Швидка рука", description: "Збільшує швидкість атаки на 15%.", cost: 60, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.85 }) },
        { id: "hammer_espresso", name: "Еспресо-рефлекс", description: "Збільшує швидкість атаки ще на 30%.", cost: 100, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.70 }) },
        { id: "hammer_two_hits", name: "Два удари", description: "Кожен 3-й удар кидає два молотки одночасно.", cost: 160, effect: (s) => ({ ...s, twoHits: true }) },
        { id: "hammer_gatling", name: "Кулемет молотків", description: "Надшвидке кидання молотків (швидкість +55%).", cost: 400, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.45 }) },
        { id: "hammer_berserk", name: "Ентропійний Берсерк", description: "Кидає 2 молотки при кожному ударі, швидкість +75%.", cost: 1500, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.25, alwaysDouble: true }) }
      ],
      path3: [
        { id: "hammer_long", name: "Дальній кидок", description: "Збільшує дальність кидка на 25px.", cost: 40, effect: (s) => ({ ...s, range: s.range + 25 }) },
        { id: "hammer_eagle", name: "Орлине око", description: "Дальність кидка +35px, виявляє камуфляжних ворогів.", cost: 70, effect: (s) => ({ ...s, range: s.range + 35, camoDetection: true }) },
        { id: "hammer_crit", name: "Критичний ПОЧУВ", description: "Дає 20% шанс завдати 3-кратну шкоду.", cost: 150, effect: (s) => ({ ...s, critChance: 0.20 }) },
        { id: "hammer_deep", name: "Глибокий аналіз", description: "Дальність +30px, шанс криту збільшується до 40%.", cost: 300, effect: (s) => ({ ...s, range: s.range + 30, critChance: 0.40 }) },
        { id: "hammer_legend", name: "Легенда без слів", description: "Шанс криту 60%, критичні удари наносять 6x шкоду.", cost: 1000, effect: (s) => ({ ...s, critChance: 0.60, critMultiplier: 6 }) }
      ]
    }
  },
  coffee: {
    name: "Nescafe Ritual",
    description: "Підтримка. Не атакує, але збільшує швидкість атаки башт поруч та генерує пасивний дохід.",
    cost: 150,
    range: 110,
    damage: 0,
    fireRate: 0,
    color: "#eab308", // Gold/yellow
    emoji: "☕",
    upgrades: {
      path1: [
        { id: "coffee_aromatic", name: "Ароматна кава", description: "Баф швидкості атаки стає +30%.", cost: 80, effect: (s) => ({ ...s, buffMultiplier: 0.30 }) },
        { id: "coffee_sugar", name: "Кава з цукром", description: "Баф швидкості атаки стає +45%.", cost: 120, effect: (s) => ({ ...s, buffMultiplier: 0.45 }) },
        { id: "coffee_no_sugar", name: "Gold без цукру", description: "Баф швидкості атаки стає +60%.", cost: 240, effect: (s) => ({ ...s, buffMultiplier: 0.60 }) },
        { id: "coffee_concentrate", name: "Надконцентрат", description: "Баф швидкості атаки стає +85%.", cost: 500, effect: (s) => ({ ...s, buffMultiplier: 0.85 }) },
        { id: "coffee_addiction", name: "Кавова залежність", description: "Баф швидкості атаки сусідніх веж стає +120%.", cost: 1500, effect: (s) => ({ ...s, buffMultiplier: 1.20 }) }
      ],
      path2: [
        { id: "coffee_sieve", name: "Широке сито", description: "Збільшує радіус дії бафу на 20px.", cost: 60, effect: (s) => ({ ...s, range: s.range + 20 }) },
        { id: "coffee_pour", name: "Термоядерний розлив", description: "Радіус бафу +30px.", cost: 100, effect: (s) => ({ ...s, range: s.range + 30 }) },
        { id: "coffee_shot", name: "Енергетичний шот", description: "Приносить +40 Gold наприкінці кожної хвилі.", cost: 200, effect: (s) => ({ ...s, endOfWaveBonus: (s.endOfWaveBonus || 0) + 40 }) },
        { id: "coffee_thermos", name: "Термос АТБ", description: "Приносить ще +100 Gold наприкінці кожної хвилі.", cost: 450, effect: (s) => ({ ...s, endOfWaveBonus: (s.endOfWaveBonus || 0) + 100 }) },
        { id: "coffee_tycoon", name: "Кавовий магнат", description: "Приносить величезні +350 Gold наприкінці кожної хвилі.", cost: 1200, effect: (s) => ({ ...s, endOfWaveBonus: (s.endOfWaveBonus || 0) + 350 }) }
      ],
      path3: [
        { id: "coffee_sour", name: "Кислинка", description: "Вежі в радіусі отримують +2 до шкоди.", cost: 90, effect: (s) => ({ ...s, damageBuff: (s.damageBuff || 0) + 2 }) },
        { id: "coffee_bitter", name: "Гіркота", description: "Вежі в радіусі отримують ще +5 до шкоди.", cost: 150, effect: (s) => ({ ...s, damageBuff: (s.damageBuff || 0) + 5 }) },
        { id: "coffee_roast", name: "Міцне обсмаження", description: "+10 шкоди, +15px дальності та виявлення камуфляжу для веж поруч.", cost: 300, effect: (s) => ({ ...s, damageBuff: (s.damageBuff || 0) + 10, rangeBuff: (s.rangeBuff || 0) + 15, camoDetectionBuff: true }) },
        { id: "coffee_filter", name: "Анти-лаг фільтр", description: "Бафнуті вежі пробивають 30% броні ворогів.", cost: 550, effect: (s) => ({ ...s, ignoreArmorBuff: 0.3 }) },
        { id: "coffee_elixir", name: "Коростишівський Еліксир", description: "Вежі в радіусі отримують +30 до шкоди та +25% дальності.", cost: 1400, effect: (s) => ({ ...s, damageBuff: (s.damageBuff || 0) + 30, rangeBuffPercent: 0.25 }) }
      ]
    }
  },
  candy: {
    name: "Рачки Launcher",
    description: "Стріляє святими цукерками «Рачки», які сповільнюють братів на 50%.",
    cost: 125,
    range: 150,
    damage: 6,
    fireRate: 1.5,
    color: "#f97316", // Orange
    emoji: "🍬",
    upgrades: {
      path1: [
        { id: "candy_sweet", name: "Солодкий удар", description: "Шкода від цукерок +3.", cost: 50, effect: (s) => ({ ...s, damage: s.damage + 3 }) },
        { id: "candy_press", name: "Карамель-прес", description: "Шкода +7, сповільнення триває на 1 секунду довше.", cost: 90, effect: (s) => ({ ...s, damage: s.damage + 7, slowDurationBonus: (s.slowDurationBonus || 0) + 60 }) },
        { id: "candy_dust", name: "Пил часу", description: "Сповільнені вороги отримують на 30% більше шкоди від усіх джерел.", cost: 170, effect: (s) => ({ ...s, damageDebuff: 1.3 }) },
        { id: "candy_paralysis", name: "Цукровий параліч", description: "Сповільнення збільшується з 50% до 70%.", cost: 350, effect: (s) => ({ ...s, slowFactorBonus: 0.2 }) },
        { id: "candy_stop", name: "Абсолютний стоп", description: "Сповільнення стає 85%, вороги отримують на 60% більше шкоди.", cost: 1100, effect: (s) => ({ ...s, slowFactorBonus: 0.35, damageDebuff: 1.6 }) }
      ],
      path2: [
        { id: "candy_big", name: "Великі рачки", description: "Дальність стрільби цукерками +15px.", cost: 40, effect: (s) => ({ ...s, range: s.range + 15 }) },
        { id: "candy_dispense", name: "Швидкий викид", description: "Швидкість стрільби цукерками +25%.", cost: 80, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.75 }) },
        { id: "candy_teacher", name: "Дар викладачці", description: "Цукерки вибухають при влучанні (радіус 60px) та виявляють камуфляж.", cost: 220, effect: (s) => ({ ...s, isAoESlow: true, camoDetection: true }) },
        { id: "candy_cloud", name: "Рачкове хмариння", description: "Вибух покриває 100px та наносить 15 шкоди.", cost: 450, effect: (s) => ({ ...s, range: s.range + 15, isAoESlow: true, explodeDmg: 15 }) },
        { id: "candy_singularity", name: "Рачкова сингулярність", description: "Цукерковий вибух у 150px наносить 80 шкоди та миттєво стопить натовп.", cost: 1300, effect: (s) => ({ ...s, isAoESlow: true, explodeDmg: 80, range: s.range + 20 }) }
      ],
      path3: [
        { id: "candy_sugar_cheap", name: "Дешевий цукор", description: "Апгрейд Candy Launcher стає дешевшим (повертає 30 Gold).", cost: 30, effect: (s) => s },
        { id: "candy_cheap", name: "Кишеньковий запас", description: "Швидкість атаки +20%, повертає 40 Gold.", cost: 60, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.8 }) },
        { id: "candy_bakery", name: "Свята цукерня", description: "Швидкість стрільби збільшується на 40%.", cost: 150, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.6 }) },
        { id: "candy_vending", name: "Автомат рачків", description: "Стріляє цукерками на 60% швидше.", cost: 380, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.4 }) },
        { id: "candy_conveyor", name: "Конвеєр Коростишева", description: "Неймовірна швидкість стрільби (кожні 0.3с), шкода +15.", cost: 1000, effect: (s) => ({ ...s, fireRate: 0.3, damage: s.damage + 15 }) }
      ]
    }
  },
  infinix: {
    name: "Infinix Tower",
    description: "Стріляє нестабільними цифровими імпульсами. Непередбачувана шкода. Бачить камуфляж.",
    cost: 200,
    range: 180,
    damage: 30,
    fireRate: 0.8,
    color: "#a855f7", // Purple
    emoji: "📱",
    camoDetection: true,
    upgrades: {
      path1: [
        { id: "infinix_voltage", name: "Висока напруга", description: "Збільшує середню шкоду на 5.", cost: 70, effect: (s) => ({ ...s, damage: s.damage + 5 }) },
        { id: "infinix_discharge", name: "Цифровий розряд", description: "Шкода +15.", cost: 120, effect: (s) => ({ ...s, damage: s.damage + 15 }) },
        { id: "infinix_gacha", name: "Гача-зрив", description: "5% шанс завдати колосальні 300 одиниць шкоди (Джекпот!).", cost: 250, effect: (s) => ({ ...s, gachaChance: 0.05 }) },
        { id: "infinix_jackpot", name: "Джекпот-адикт", description: "Шанс джекпоту збільшується до 12% на 350 шкоди.", cost: 500, effect: (s) => ({ ...s, gachaChance: 0.12, damage: s.damage + 10 }) },
        { id: "infinix_pull", name: "5-Зірковий пул", description: "Шанс джекпоту 25%, шкода джекпоту стає 600.", cost: 1500, effect: (s) => ({ ...s, gachaChance: 0.25, gachaDamageOverride: 600 }) }
      ],
      path2: [
        { id: "infinix_refresh90", name: "Частота 90Гц", description: "Збільшує швидкість імпульсу на 15%.", cost: 80, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.85 }) },
        { id: "infinix_refresh120", name: "Частота 120Гц", description: "Швидкість стрільби +30%.", cost: 130, effect: (s) => ({ ...s, fireRate: s.fireRate * 0.70 }) },
        { id: "infinix_lag", name: "Лаг 999 мс", description: "Імпульси мають 15% шанс повністю заморозити ворога на 1 секунду.", cost: 230, effect: (s) => ({ ...s, freezeChance: 0.15 }) },
        { id: "infinix_freeze", name: "Критичний фриз", description: "Шанс заморозки 30%, тривалість збільшується до 2 секунд.", cost: 480, effect: (s) => ({ ...s, freezeChance: 0.30, freezeDurationBonus: 60 }) },
        { id: "infinix_bsod", name: "Синій екран (BSOD)", description: "45% шанс заморозити ворога на 3с. Заморожені вороги сповільнюють сусідів.", cost: 1400, effect: (s) => ({ ...s, freezeChance: 0.45, freezeDurationBonus: 120, bsodAoE: true }) }
      ],
      path3: [
        { id: "infinix_4g", name: "Сигнал 4G", description: "Дальність стрільби вежі +25px.", cost: 50, effect: (s) => ({ ...s, range: s.range + 25 }) },
        { id: "infinix_5g", name: "Антена 5G", description: "Дальність вежі +40px.", cost: 90, effect: (s) => ({ ...s, range: s.range + 40 }) },
        { id: "infinix_copilot", name: "Copilot Manager", description: "Заражає ворога багом. При смерті ворога з багом, він вибухає на 50 шкоди навколо.", cost: 280, effect: (s) => ({ ...s, copilotBug: true }) },
        { id: "infinix_worm", name: "Мережевий черв", description: "Вибух багу наносить 90 шкоди в радіусі 100px.", cost: 550, effect: (s) => ({ ...s, copilotBug: true, bugExplodeDmg: 90, bugExplodeRadius: 100 }) },
        { id: "infinix_super", name: "Суперкомп'ютер", description: "Вибух наносить 250 шкоди, розповсюджуючи баг на сусідніх ворогів.", cost: 1600, effect: (s) => ({ ...s, copilotBug: true, bugExplodeDmg: 250, bugExplodeRadius: 150, bugContagion: true }) }
      ]
    }
  },
  gas: {
    name: "Газова Аура",
    description: "AoE-хмара навколо себе. Постійно наносить шкоду та уповільнює на 15%.",
    cost: 175,
    range: 90,
    damage: 12,
    fireRate: 0.2,
    color: "#22c55e", // Green
    emoji: "💨",
    upgrades: {
      path1: [
        { id: "gas_radius1", name: "Широка зона", description: "Збільшує радіус дії аури на 25px.", cost: 50, effect: (s) => ({ ...s, range: s.range + 25 }) },
        { id: "gas_radius2", name: "Один Скін", description: "Збільшує радіус дії аури на 40px.", cost: 90, effect: (s) => ({ ...s, range: s.range + 40 }) },
        { id: "gas_double_cloud", name: "Подвійна хмара", description: "Радіус аури +40px, шкода +5.", cost: 180, effect: (s) => ({ ...s, range: s.range + 40, damage: s.damage + 5 }) },
        { id: "gas_cyclone", name: "Коростишівський циклон", description: "Радіус аури +50px, шкода +15.", cost: 450, effect: (s) => ({ ...s, range: s.range + 50, damage: s.damage + 15 }) },
        { id: "gas_doomsday", name: "Екологічна катастрофа", description: "Велетенський радіус (+80px), шкода +60, ігнорує будь-яку броню.", cost: 1400, effect: (s) => ({ ...s, range: s.range + 80, damage: s.damage + 60, ignoresArmor: true }) }
      ],
      path2: [
        { id: "gas_odor", name: "Різкий запах", description: "Збільшує шкоду аури на 3.", cost: 60, effect: (s) => ({ ...s, damage: s.damage + 3 }) },
        { id: "gas_stasis", name: "Капсула Стазису", description: "Уповільнення ворогів всередині аури збільшується до 40%.", cost: 100, effect: (s) => ({ ...s, slowAmount: 0.40 }) },
        { id: "gas_acid", name: "Кислотний туман", description: "Шкода +10. Вороги всередині отримують на 25% більше шкоди від усіх джерел.", cost: 220, effect: (s) => ({ ...s, damage: s.damage + 10, damageDebuff: 1.25 }) },
        { id: "gas_asphyxia", name: "Ядуха", description: "Шкода +25, уповільнення збільшується до 60%.", cost: 500, effect: (s) => ({ ...s, damage: s.damage + 25, slowAmount: 0.60 }) },
        { id: "gas_weapon", name: "Біологічна зброя", description: "Шкода +80, уповільнення 80%, вороги отримують на 50% більше шкоди.", cost: 1500, effect: (s) => ({ ...s, damage: s.damage + 80, slowAmount: 0.80, damageDebuff: 1.50 }) }
      ],
      path3: [
        { id: "gas_cheap_filter", name: "Дешевий фільтр", description: "Радіус аури +15px.", cost: 40, effect: (s) => ({ ...s, range: s.range + 15 }) },
        { id: "gas_containment", name: "Біологічне стримування", description: "Аура завдає подвійну шкоду броньованим ворогам та виявляє камуфляж.", cost: 80, effect: (s) => ({ ...s, antiArmor: true, camoDetection: true }) },
        { id: "gas_glitch", name: "Глючний газ", description: "Infinix-брати втрачають можливість телепортуватися всередині аури.", cost: 200, effect: (s) => ({ ...s, disableGlitch: true }) },
        { id: "gas_gacha", name: "Аура Гачі", description: "8% шанс нанести ворогам 150 додаткової шкоди при кожному тику.", cost: 480, effect: (s) => ({ ...s, gachaChance: 0.08, gachaDamageOverride: 150 }) },
        { id: "gas_entropy", name: "Ентропійний колапс", description: "Повністю відключає спеціальні здібності ворогів в аурі. Шкода +35.", cost: 1300, effect: (s) => ({ ...s, damage: s.damage + 35, disableGlitch: true, disableAbilities: true }) }
      ]
    }
  }
};

export const ENEMY_CONFIGS: Record<string, EnemyConfig> = {
  ordinary: {
    name: "Звичайний Брат",
    hp: 60,
    speed: 1.2,
    reward: 6,
    damage: 5,
    color: "#94a3b8",
    borderColor: "#475569",
    radius: 14,
    description: "Базовий повільний ворог, без особливих скілів."
  },
  fast: {
    name: "Швидкий Брат",
    hp: 40,
    speed: 2.2,
    reward: 5,
    damage: 5,
    color: "#fbbf24",
    borderColor: "#d97706",
    radius: 12,
    description: "Дуже швидкий, створює тиск на перших секундах."
  },
  heavy: {
    name: "Товстий Брат",
    hp: 300,
    speed: 0.7,
    reward: 15,
    damage: 15,
    color: "#f87171",
    borderColor: "#dc2626",
    radius: 18,
    description: "Повільний здоровань. Тестує ваш DPS."
  },
  coat: {
    name: "Брат у Куртці",
    hp: 150,
    speed: 1.0,
    reward: 12,
    damage: 10,
    color: "#38bdf8",
    borderColor: "#0284c7",
    radius: 15,
    isArmored: true,
    description: "Носить панцир-куртку. Отримує на 50% менше шкоди від молотків."
  },
  infinix_brat: {
    name: "Інфінікс-Брат",
    hp: 200,
    speed: 1.3,
    reward: 18,
    damage: 12,
    color: "#c084fc",
    borderColor: "#7c3aed",
    radius: 14,
    isGlitching: true,
    description: "Має Infinix. Періодично лагає й телепортується на 45px вперед."
  },
  boss: {
    name: "Головний Брат",
    hp: 1500,
    speed: 0.6,
    reward: 60,
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
    hp: 100,
    speed: 1.1,
    reward: 10,
    damage: 8,
    color: "#fda4af",
    borderColor: "#e11d48",
    radius: 13,
    isSpawningTrail: true,
    description: "Залишає пил від цукерок, що прискорює інших братів на 40%."
  },
  gas_brat: {
    name: "Газовий Брат",
    hp: 180,
    speed: 0.9,
    reward: 12,
    damage: 10,
    color: "#86efac",
    borderColor: "#16a34a",
    radius: 15,
    isSlowingTowers: true,
    description: "Поширює неприємний запах, уповільнюючи атаку веж поруч на 40%."
  },
  granite: {
    name: "Гранітний Брат",
    hp: 500,
    speed: 0.4,
    reward: 25,
    damage: 20,
    color: "#6b7280",
    borderColor: "#1f2937",
    radius: 17,
    isSuperArmored: true,
    description: "З Коростишева. Броня знижує фізичну шкоду від молотків на 75%."
  },
  camo: {
    name: "Камуфляжний Брат",
    hp: 80,
    speed: 1.5,
    reward: 12,
    damage: 8,
    color: "#065f46",
    borderColor: "#022c22",
    radius: 13,
    isCamo: true,
    description: "Невидимий для більшості веж без сканера або орлиного ока."
  },
  regen: {
    name: "Регенеративний Брат",
    hp: 120,
    speed: 1.0,
    reward: 15,
    damage: 10,
    color: "#db2777",
    borderColor: "#831843",
    radius: 14,
    isRegen: true,
    description: "Постійно регенерує здоров'я, якщо не заморожений."
  },
  lead: {
    name: "Свинцевий Брат",
    hp: 150,
    speed: 0.6,
    reward: 20,
    damage: 12,
    color: "#4b5563",
    borderColor: "#1f2937",
    radius: 16,
    isLead: true,
    description: "Повністю імунний до молотків. Вразливий до кави, цукерок та газу."
  }
};

export interface WaveSegment {
  type: string;
  count: number;
  spawnDelay: number; // in milliseconds
  delayBeforeNext?: number; // wait before spawning next segment in same wave
}

export const WAVES: WaveSegment[][] = [
  // Wave 1: Intro to Ordinary Brats
  [
    { type: "ordinary", count: 15, spawnDelay: 1500 }
  ],
  // Wave 2: A bit more ordinary, and introduction of Fast Brats
  [
    { type: "ordinary", count: 12, spawnDelay: 1200, delayBeforeNext: 1500 },
    { type: "fast", count: 8, spawnDelay: 800 }
  ],
  // Wave 3: Faster rushes
  [
    { type: "ordinary", count: 20, spawnDelay: 800, delayBeforeNext: 1000 },
    { type: "fast", count: 15, spawnDelay: 600 }
  ],
  // Wave 4: First Heavy Brat testing DPS
  [
    { type: "ordinary", count: 10, spawnDelay: 1000, delayBeforeNext: 1000 },
    { type: "heavy", count: 5, spawnDelay: 3000 }
  ],
  // Wave 5: Introducing Camo Brats!
  [
    { type: "camo", count: 8, spawnDelay: 1500, delayBeforeNext: 1000 },
    { type: "fast", count: 15, spawnDelay: 500 }
  ],
  // Wave 6: Heavy Coat armored rush
  [
    { type: "coat", count: 12, spawnDelay: 1200, delayBeforeNext: 1000 },
    { type: "ordinary", count: 10, spawnDelay: 800 }
  ],
  // Wave 7: Introducing Lead Brats!
  [
    { type: "lead", count: 10, spawnDelay: 1800, delayBeforeNext: 1000 },
    { type: "ordinary", count: 15, spawnDelay: 800 }
  ],
  // Wave 8: Mixed Camo and Lead
  [
    { type: "camo", count: 12, spawnDelay: 1000, delayBeforeNext: 800 },
    { type: "lead", count: 8, spawnDelay: 1500 }
  ],
  // Wave 9: Infinix glitchers support rush
  [
    { type: "infinix_brat", count: 8, spawnDelay: 1500, delayBeforeNext: 1000 },
    { type: "coat", count: 10, spawnDelay: 1000, delayBeforeNext: 800 },
    { type: "fast", count: 10, spawnDelay: 500 }
  ],
  // Wave 10: Introducing Regen Brats!
  [
    { type: "regen", count: 12, spawnDelay: 1200, delayBeforeNext: 1000 },
    { type: "fast", count: 12, spawnDelay: 600 }
  ],
  // Wave 11: Support swarm (trails & tower slows)
  [
    { type: "rachky_brat", count: 15, spawnDelay: 800, delayBeforeNext: 800 },
    { type: "gas_brat", count: 15, spawnDelay: 1000 }
  ],
  // Wave 12: Granite blockers
  [
    { type: "granite", count: 10, spawnDelay: 2000, delayBeforeNext: 1000 },
    { type: "heavy", count: 10, spawnDelay: 1500 }
  ],
  // Wave 13: Camo-Regen rush
  [
    { type: "camo", count: 20, spawnDelay: 800, delayBeforeNext: 800 },
    { type: "regen", count: 15, spawnDelay: 1000 }
  ],
  // Wave 14: Lead and Infinix glitchers
  [
    { type: "lead", count: 15, spawnDelay: 1000, delayBeforeNext: 800 },
    { type: "infinix_brat", count: 15, spawnDelay: 900 }
  ],
  // Wave 15: Triple mixed rush
  [
    { type: "regen", count: 12, spawnDelay: 1000, delayBeforeNext: 800 },
    { type: "granite", count: 10, spawnDelay: 1500, delayBeforeNext: 500 },
    { type: "fast", count: 20, spawnDelay: 400 }
  ],
  // Wave 16: The Boss and granite support
  [
    { type: "boss", count: 1, spawnDelay: 4000, delayBeforeNext: 2000 },
    { type: "granite", count: 8, spawnDelay: 1500, delayBeforeNext: 500 },
    { type: "coat", count: 12, spawnDelay: 800 }
  ],
  // Wave 17: Camo-Lead-Regen rush
  [
    { type: "camo", count: 25, spawnDelay: 600, delayBeforeNext: 500 },
    { type: "lead", count: 15, spawnDelay: 1000, delayBeforeNext: 500 },
    { type: "regen", count: 15, spawnDelay: 800 }
  ],
  // Wave 18: Digital chaos (glitchers + trails + slows)
  [
    { type: "infinix_brat", count: 20, spawnDelay: 800, delayBeforeNext: 500 },
    { type: "rachky_brat", count: 20, spawnDelay: 600, delayBeforeNext: 500 },
    { type: "gas_brat", count: 20, spawnDelay: 800 }
  ],
  // Wave 19: High-health regen & granite wall
  [
    { type: "granite", count: 15, spawnDelay: 1200, delayBeforeNext: 500 },
    { type: "regen", count: 15, spawnDelay: 800, delayBeforeNext: 500 },
    { type: "camo", count: 15, spawnDelay: 600 }
  ],
  // Wave 20: Double bosses
  [
    { type: "boss", count: 2, spawnDelay: 3000, delayBeforeNext: 1000 },
    { type: "heavy", count: 15, spawnDelay: 1200 }
  ],
  // Wave 21: Camo-Regen-Lead swarm
  [
    { type: "camo", count: 30, spawnDelay: 400, delayBeforeNext: 500 },
    { type: "regen", count: 30, spawnDelay: 500, delayBeforeNext: 500 },
    { type: "lead", count: 20, spawnDelay: 800 }
  ],
  // Wave 22: The Ultimate Final Wave!
  [
    { type: "boss", count: 4, spawnDelay: 3000, delayBeforeNext: 1000 },
    { type: "granite", count: 20, spawnDelay: 1000, delayBeforeNext: 500 },
    { type: "infinix_brat", count: 20, spawnDelay: 800, delayBeforeNext: 500 },
    { type: "camo", count: 25, spawnDelay: 500, delayBeforeNext: 500 },
    { type: "lead", count: 25, spawnDelay: 800, delayBeforeNext: 500 },
    { type: "regen", count: 25, spawnDelay: 600 }
  ]
];

export function getScaledWave(waveNumber: number): WaveSegment[] {
  // WaveNumber is 1-indexed. If it's <= 22, return static wave
  if (waveNumber <= 22) {
    return WAVES[waveNumber - 1];
  }

  // Endless mode: Procedurally scale Wave 22 with a multiplier
  const multiplier = Math.pow(1.15, waveNumber - 22);

  // We can construct a randomized segment list based on wave number
  const types = ["ordinary", "fast", "heavy", "coat", "infinix_brat", "rachky_brat", "gas_brat", "granite", "camo", "regen", "lead"];
  const segments: WaveSegment[] = [];

  // Always add some boss(es) in multiples of 5 waves
  if (waveNumber % 5 === 0) {
    const bossCount = Math.floor((waveNumber - 5) / 5);
    segments.push({ type: "boss", count: bossCount, spawnDelay: 4000, delayBeforeNext: 2000 });
  }

  // Add 3-5 random segments of increasing difficulty
  const segmentCount = 3 + Math.min(5, Math.floor((waveNumber - 22) / 3));
  for (let i = 0; i < segmentCount; i++) {
    const randomType = types[Math.floor(Math.random() * types.length)];
    const baseCount = randomType === "granite" || randomType === "heavy" ? 3 : 8;
    const count = Math.floor(baseCount * Math.sqrt(multiplier));
    const delay = Math.max(200, Math.floor(1000 / (1 + (waveNumber - 22) * 0.1)));
    segments.push({
      type: randomType,
      count: count > 0 ? count : 1,
      spawnDelay: delay,
      delayBeforeNext: 1000
    });
  }

  return segments;
}

export function getEnemyStatsForWave(type: string, waveNumber: number): EnemyConfig {
  const base = ENEMY_CONFIGS[type];
  if (!base) return ENEMY_CONFIGS.ordinary;
  if (waveNumber <= 22) return base;

  const multiplier = Math.pow(1.18, waveNumber - 22);
  const speedMultiplier = Math.min(1.8, Math.pow(1.025, waveNumber - 22));

  return {
    ...base,
    hp: Math.floor(base.hp * multiplier),
    speed: base.speed * speedMultiplier,
    reward: Math.floor(base.reward * Math.pow(1.03, waveNumber - 22))
  };
}
