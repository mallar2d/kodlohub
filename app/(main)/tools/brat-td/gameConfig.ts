export interface PathPoint {
  x: number;
  y: number;
}

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 500;

export const PATH: PathPoint[] = [
  { x: 0, y: 250 },
  { x: 180, y: 250 },
  { x: 180, y: 100 },
  { x: 380, y: 100 },
  { x: 380, y: 400 },
  { x: 580, y: 400 },
  { x: 580, y: 250 },
  { x: 800, y: 250 }
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
}

export interface TowerConfig extends TowerStats {
  upgrades: Upgrade[];
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
    upgrades: [
      {
        id: "hammer_two_hits",
        name: "Два удари",
        description: "Кожен 3-й удар кидає два молотки одночасно.",
        cost: 80,
        effect: (stats) => ({ ...stats, twoHits: true })
      },
      {
        id: "hammer_heavy",
        name: "Важкий молоток",
        description: "Суттєво збільшує шкоду (+25) та радіус (+20), але сповільнює атаку (+30% часу).",
        cost: 120,
        effect: (stats) => ({
          ...stats,
          damage: stats.damage + 25,
          range: stats.range + 20,
          fireRate: stats.fireRate * 1.3
        })
      },
      {
        id: "hammer_crit",
        name: "Критичний ПОЧУВ",
        description: "Дає 25% шанс завдати 3-кратну шкоду з характерним звуком.",
        cost: 150,
        effect: (stats) => ({ ...stats, critChance: 0.25 })
      }
    ]
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
    upgrades: [
      {
        id: "coffee_no_sugar",
        name: "Gold без цукру",
        description: "Збільшує баф швидкості атаки сусідніх башт з +25% до +45%.",
        cost: 120,
        effect: (stats) => ({ ...stats, buffMultiplier: 0.45 })
      },
      {
        id: "coffee_fusion",
        name: "Термоядерна кава",
        description: "Збільшує радіус дії бафу (+40px) та приносить +30 Nescafe Gold наприкінці кожної хвилі.",
        cost: 160,
        effect: (stats) => ({
          ...stats,
          range: stats.range + 40,
          endOfWaveBonus: (stats.endOfWaveBonus || 0) + 30
        })
      },
      {
        id: "coffee_addiction",
        name: "Кавова залежність",
        description: "Баф швидкості атаки стає +75%. Вражаюче!",
        cost: 200,
        effect: (stats) => ({ ...stats, buffMultiplier: 0.75 })
      }
    ]
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
    upgrades: [
      {
        id: "candy_cheap",
        name: "Кишенькові рачки",
        description: "Збільшує швидкість стрільби на 40% та повертає 40 Gold.",
        cost: 70,
        effect: (stats) => ({ ...stats, fireRate: stats.fireRate * 0.6 })
      },
      {
        id: "candy_teacher",
        name: "Дар викладачці",
        description: "Вибухає при влучанні, сповільнюючи всіх братів у невеликому радіусі (60px).",
        cost: 145,
        effect: (stats) => ({ ...stats, isAoESlow: true })
      },
      {
        id: "candy_time_dust",
        name: "Пил часу",
        description: "Сповільнені брати отримують на 30% більше шкоди від інших башт.",
        cost: 180,
        effect: (stats) => ({ ...stats, damageDebuff: 1.3 })
      }
    ]
  },
  infinix: {
    name: "Infinix Tower",
    description: "Стріляє нестабільними цифровими імпульсами. Непередбачувана шкода.",
    cost: 200,
    range: 180,
    damage: 30, // represents average/base
    fireRate: 0.8,
    color: "#a855f7", // Purple
    emoji: "📱",
    upgrades: [
      {
        id: "infinix_lag",
        name: "Лаг 999 мс",
        description: "Кожен імпульс має 15% шанс повністю заморозити ворога на 1 секунду.",
        cost: 130,
        effect: (stats) => ({ ...stats, freezeChance: 0.15 })
      },
      {
        id: "infinix_gacha",
        name: "Гача-зрив",
        description: "5% шанс завдати колосальні 300 одиниць шкоди (Джекпот!).",
        cost: 190,
        effect: (stats) => ({ ...stats, gachaChance: 0.05 })
      },
      {
        id: "infinix_copilot",
        name: "Copilot Manager",
        description: "Заражає ворога багом. При смерті ворога з багом, він вибухає на 50 шкоди навколо.",
        cost: 230,
        effect: (stats) => ({ ...stats, copilotBug: true })
      }
    ]
  },
  gas: {
    name: "Газова Аура",
    description: "AoE-хмара навколо себе. Постійно наносить шкоду та уповільнює на 15%.",
    cost: 175,
    range: 90,
    damage: 12, // DPS
    fireRate: 0.2, // Tick duration
    color: "#22c55e", // Green
    emoji: "💨",
    upgrades: [
      {
        id: "gas_one_skin",
        name: "Один Скін",
        description: "Збільшує радіус дії аури (+40px).",
        cost: 90,
        effect: (stats) => ({ ...stats, range: stats.range + 40 })
      },
      {
        id: "gas_stasis",
        name: "Капсула Стазису",
        description: "Уповільнення ворогів всередині аури збільшується до 40%.",
        cost: 150,
        effect: (stats) => ({ ...stats, slowAmount: 0.40 })
      },
      {
        id: "gas_containment",
        name: "Біологічне стримування",
        description: "Аура завдає подвійну шкоду броньованим ворогам (Брати в Куртці та Гранітні).",
        cost: 170,
        effect: (stats) => ({ ...stats, antiArmor: true })
      }
    ]
  }
};

export const ENEMY_CONFIGS: Record<string, EnemyConfig> = {
  ordinary: {
    name: "Звичайний Брат",
    hp: 40,
    speed: 1.2,
    reward: 15,
    damage: 5,
    color: "#94a3b8",
    borderColor: "#475569",
    radius: 14,
    description: "Базовий повільний ворог, без особливих скілів."
  },
  fast: {
    name: "Швидкий Брат",
    hp: 25,
    speed: 2.2,
    reward: 12,
    damage: 5,
    color: "#fbbf24",
    borderColor: "#d97706",
    radius: 12,
    description: "Дуже швидкий, створює тиск на перших секундах."
  },
  heavy: {
    name: "Товстий Брат",
    hp: 180,
    speed: 0.7,
    reward: 35,
    damage: 15,
    color: "#f87171",
    borderColor: "#dc2626",
    radius: 18,
    description: "Повільний здоровань. Тестує ваш DPS."
  },
  coat: {
    name: "Брат у Куртці",
    hp: 90,
    speed: 1.0,
    reward: 30,
    damage: 10,
    color: "#38bdf8",
    borderColor: "#0284c7",
    radius: 15,
    isArmored: true,
    description: "Носить панцир-куртку. Отримує на 50% менше шкоди від молотків."
  },
  infinix_brat: {
    name: "Інфінікс-Брат",
    hp: 110,
    speed: 1.3,
    reward: 40,
    damage: 12,
    color: "#c084fc",
    borderColor: "#7c3aed",
    radius: 14,
    isGlitching: true,
    description: "Має Infinix. Періодично лагає й телепортується на 45px вперед."
  },
  boss: {
    name: "Головний Брат",
    hp: 800,
    speed: 0.6,
    reward: 150,
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
    hp: 60,
    speed: 1.1,
    reward: 25,
    damage: 8,
    color: "#fda4af",
    borderColor: "#e11d48",
    radius: 13,
    isSpawningTrail: true,
    description: "Залишає пил від цукерок, що прискорює інших братів на 40%."
  },
  gas_brat: {
    name: "Газовий Брат",
    hp: 100,
    speed: 0.9,
    reward: 30,
    damage: 10,
    color: "#86efac",
    borderColor: "#16a34a",
    radius: 15,
    isSlowingTowers: true,
    description: "Поширює неприємний запах, уповільнюючи атаку веж поруч на 40%."
  },
  granite: {
    name: "Гранітний Брат",
    hp: 300,
    speed: 0.4,
    reward: 50,
    damage: 20,
    color: "#6b7280",
    borderColor: "#1f2937",
    radius: 17,
    isSuperArmored: true,
    description: "З Коростишева. Броня знижує фізичну шкоду від молотків на 75%."
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
    { type: "ordinary", count: 6, spawnDelay: 2000 }
  ],
  // Wave 2: A bit more ordinary, and introduction of Fast Brats
  [
    { type: "ordinary", count: 8, spawnDelay: 1500, delayBeforeNext: 2000 },
    { type: "fast", count: 3, spawnDelay: 1200 }
  ],
  // Wave 3: Faster rushes
  [
    { type: "ordinary", count: 10, spawnDelay: 1000, delayBeforeNext: 1500 },
    { type: "fast", count: 8, spawnDelay: 800 }
  ],
  // Wave 4: First Heavy Brat testing DPS
  [
    { type: "ordinary", count: 8, spawnDelay: 1200, delayBeforeNext: 2000 },
    { type: "heavy", count: 2, spawnDelay: 4000, delayBeforeNext: 1000 },
    { type: "fast", count: 5, spawnDelay: 1000 }
  ],
  // Wave 5: Introducing Brats in Coats (armored)
  [
    { type: "coat", count: 5, spawnDelay: 2000, delayBeforeNext: 1500 },
    { type: "ordinary", count: 12, spawnDelay: 800, delayBeforeNext: 1000 },
    { type: "fast", count: 6, spawnDelay: 600 }
  ],
  // Wave 6: Glitching Infinix Brats
  [
    { type: "infinix_brat", count: 5, spawnDelay: 2200, delayBeforeNext: 1000 },
    { type: "coat", count: 6, spawnDelay: 1500 }
  ],
  // Wave 7: Rachky and Gas support brats
  [
    { type: "rachky_brat", count: 4, spawnDelay: 1800, delayBeforeNext: 500 },
    { type: "gas_brat", count: 4, spawnDelay: 2000, delayBeforeNext: 1000 },
    { type: "infinix_brat", count: 4, spawnDelay: 1500 }
  ],
  // Wave 8: Heavy granite block and mixed rush
  [
    { type: "granite", count: 3, spawnDelay: 3000, delayBeforeNext: 1000 },
    { type: "fast", count: 15, spawnDelay: 400, delayBeforeNext: 500 },
    { type: "heavy", count: 4, spawnDelay: 2000 }
  ],
  // Wave 9: Hard mixed wave
  [
    { type: "coat", count: 8, spawnDelay: 1200, delayBeforeNext: 500 },
    { type: "infinix_brat", count: 8, spawnDelay: 1000, delayBeforeNext: 800 },
    { type: "granite", count: 4, spawnDelay: 2500 }
  ],
  // Wave 10: Final Boss - Golovnyi Brat (plus guards)
  [
    { type: "boss", count: 1, spawnDelay: 5000, delayBeforeNext: 3000 },
    { type: "granite", count: 2, spawnDelay: 2000, delayBeforeNext: 1000 },
    { type: "infinix_brat", count: 6, spawnDelay: 1200 }
  ],
  // Wave 11: Swarm of Fast Brats and Ordinary (speed test)
  [
    { type: "fast", count: 20, spawnDelay: 400, delayBeforeNext: 1000 },
    { type: "ordinary", count: 10, spawnDelay: 600 }
  ],
  // Wave 12: Swarm of Heavy Brats (dps test)
  [
    { type: "heavy", count: 8, spawnDelay: 2000, delayBeforeNext: 1000 },
    { type: "fast", count: 10, spawnDelay: 500 }
  ],
  // Wave 13: Armor Swarm (Coat and Granite check)
  [
    { type: "coat", count: 12, spawnDelay: 1000, delayBeforeNext: 1000 },
    { type: "granite", count: 6, spawnDelay: 2000 }
  ],
  // Wave 14: Infinix glitchers and support (glitch warp check)
  [
    { type: "infinix_brat", count: 10, spawnDelay: 1000, delayBeforeNext: 800 },
    { type: "rachky_brat", count: 8, spawnDelay: 800 }
  ],
  // Wave 15: Heavy stinky gas wave (aura and slow check)
  [
    { type: "gas_brat", count: 12, spawnDelay: 1200, delayBeforeNext: 1000 },
    { type: "heavy", count: 6, spawnDelay: 1500 }
  ],
  // Wave 16: Boss split checkers (double mini-boss)
  [
    { type: "boss", count: 2, spawnDelay: 4000, delayBeforeNext: 1000 },
    { type: "fast", count: 15, spawnDelay: 500 }
  ],
  // Wave 17: Support swarm (buff trails and smell slow)
  [
    { type: "rachky_brat", count: 12, spawnDelay: 800, delayBeforeNext: 500 },
    { type: "gas_brat", count: 12, spawnDelay: 800, delayBeforeNext: 500 },
    { type: "fast", count: 10, spawnDelay: 400 }
  ],
  // Wave 18: Granite wall (extreme physical armor)
  [
    { type: "granite", count: 15, spawnDelay: 1500 }
  ],
  // Wave 19: Glitch swarm
  [
    { type: "infinix_brat", count: 20, spawnDelay: 800 }
  ],
  // Wave 20: Three Bosses
  [
    { type: "boss", count: 3, spawnDelay: 3500, delayBeforeNext: 1000 },
    { type: "heavy", count: 8, spawnDelay: 1500 }
  ],
  // Wave 21: Mixed madness (fast + support + glitch)
  [
    { type: "fast", count: 30, spawnDelay: 300, delayBeforeNext: 500 },
    { type: "rachky_brat", count: 15, spawnDelay: 600, delayBeforeNext: 500 },
    { type: "infinix_brat", count: 12, spawnDelay: 800 }
  ],
  // Wave 22: The Ultimate final wave (All stars!)
  [
    { type: "boss", count: 3, spawnDelay: 3000, delayBeforeNext: 1000 },
    { type: "granite", count: 10, spawnDelay: 1200, delayBeforeNext: 1000 },
    { type: "infinix_brat", count: 15, spawnDelay: 800, delayBeforeNext: 1000 },
    { type: "gas_brat", count: 10, spawnDelay: 1000 }
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
  const types = ["ordinary", "fast", "heavy", "coat", "infinix_brat", "rachky_brat", "gas_brat", "granite"];
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
