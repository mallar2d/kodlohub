export type SkinId =
  | "classic"
  | "nescafe"
  | "chugun"
  | "sadoczyk"
  | "podro"
  | "cyber"
  | "bloody"
  | "granite"
  | "mold"
  | "broth"
  | "rgb_gamer"
  | "void_hikka"
  | "infinix"
  | "baklaga"
  | "shemet"
  | "toxic_carrot"
  | "retro_pixel"
  | "zebra";

export interface SkinDefinition {
  id: SkinId;
  name: string;
  lore: string;
  headColor: string;
  bodyColors: string[];
  eyeColor: string;
  pupilColor: string;
  glowColor?: string;
  pattern?: "solid" | "striped" | "rings" | "rainbow" | "camo";
  trailEffect?: "default" | "gold" | "fire" | "poison" | "rainbow" | "cyber" | "smoke";
  eyeStyle?: "normal" | "angry" | "cyborg" | "void" | "hypno" | "alien";
}

export const SKINS: Record<SkinId, SkinDefinition> = {
  classic: {
    id: "classic",
    name: "Класичний Опариш",
    lore: "Легендарна розбухла макаронина з супу Подро. Біла, жирна, непереможна.",
    headColor: "#f5f5f5",
    bodyColors: ["#ffffff", "#eaeaea", "#dedede", "#cccccc"],
    eyeColor: "#111111",
    pupilColor: "#ffffff",
    glowColor: "rgba(255, 255, 255, 0.2)",
    pattern: "solid",
    trailEffect: "default",
    eyeStyle: "normal",
  },
  nescafe: {
    id: "nescafe",
    name: "Nescafe Gold",
    lore: "Опариш, вирощений на сублімованих гранулах елітної кави. Сяє шляхетним золотом.",
    headColor: "#d4af37",
    bodyColors: ["#e5c158", "#c89b27", "#8c6b1b", "#544010"],
    eyeColor: "#1a120b",
    pupilColor: "#ffd700",
    glowColor: "rgba(212, 175, 55, 0.4)",
    pattern: "rings",
    trailEffect: "gold",
    eyeStyle: "normal",
  },
  chugun: {
    id: "chugun",
    name: "Жирна Сковорідка",
    lore: "Чорний від нагару чавун 4-го класу захисту прямо з рюкзака Подро.",
    headColor: "#2a2a2e",
    bodyColors: ["#1e1e22", "#2d2d34", "#3b3b44", "#161618"],
    eyeColor: "#ffffff",
    pupilColor: "#ff4444",
    glowColor: "rgba(255, 255, 255, 0.15)",
    pattern: "solid",
    trailEffect: "smoke",
    eyeStyle: "angry",
  },
  sadoczyk: {
    id: "sadoczyk",
    name: "Сік «Садочок»",
    lore: "Єдиний напій, що одного разу порушив кавово-водну матрицю Подро.",
    headColor: "#4caf50",
    bodyColors: ["#66bb6a", "#43a047", "#2e7d32", "#1b5e20"],
    eyeColor: "#ffffff",
    pupilColor: "#00e676",
    glowColor: "rgba(76, 175, 80, 0.35)",
    pattern: "striped",
    trailEffect: "poison",
    eyeStyle: "normal",
  },
  podro: {
    id: "podro",
    name: "Подро-Фейс",
    lore: "Опариш із трансцендентним поглядом хікана, що знайшов істину під ліжком.",
    headColor: "#9e9e9e",
    bodyColors: ["#bdbdbd", "#757575", "#616161", "#424242"],
    eyeColor: "#121212",
    pupilColor: "#00e5ff",
    glowColor: "rgba(0, 229, 255, 0.25)",
    pattern: "rings",
    trailEffect: "cyber",
    eyeStyle: "hypno",
  },
  cyber: {
    id: "cyber",
    name: "Кібер-Уретра",
    lore: "Високотехнологічний зонд для навігації в біологічних магістралях.",
    headColor: "#ffffff",
    bodyColors: ["#dadbdf", "#9e9e9e", "#616161", "#212327"],
    eyeColor: "#000000",
    pupilColor: "#00e5ff",
    glowColor: "rgba(0, 229, 255, 0.4)",
    pattern: "striped",
    trailEffect: "cyber",
    eyeStyle: "cyborg",
  },
  bloody: {
    id: "bloody",
    name: "Кавовий Бариста",
    lore: "Опариш кольору міцного темного еспресо з кавовою піною.",
    headColor: "#4e342e",
    bodyColors: ["#3e2723", "#5d4037", "#6d4c41", "#795548"],
    eyeColor: "#ffffff",
    pupilColor: "#ff7a17",
    glowColor: "rgba(255, 122, 23, 0.3)",
    pattern: "rings",
    trailEffect: "fire",
    eyeStyle: "normal",
  },
  granite: {
    id: "granite",
    name: "Коростишівський Граніт",
    lore: "Монументальний кам'яний опариш, витесаний з кар'єрного лабрадориту.",
    headColor: "#455a64",
    bodyColors: ["#37474f", "#546e7a", "#263238", "#78909c"],
    eyeColor: "#eceff1",
    pupilColor: "#00bcd4",
    glowColor: "rgba(0, 188, 212, 0.25)",
    pattern: "camo",
    trailEffect: "smoke",
    eyeStyle: "angry",
  },
  mold: {
    id: "mold",
    name: "Цивілізація Плісняви",
    lore: "Колонія міцелію з брудного посуду під ліжком, що навчилася повзати.",
    headColor: "#00897b",
    bodyColors: ["#26a69a", "#00695c", "#004d40", "#80cbc4"],
    eyeColor: "#1de9b6",
    pupilColor: "#000000",
    glowColor: "rgba(29, 233, 182, 0.35)",
    pattern: "camo",
    trailEffect: "poison",
    eyeStyle: "alien",
  },
  broth: {
    id: "broth",
    name: "Золотий Бульйон",
    lore: "Маслянистий наваристий бульйон із супу Подро з блискітками жиру.",
    headColor: "#ffb300",
    bodyColors: ["#ffc107", "#ffa000", "#ff8f00", "#ffe082"],
    eyeColor: "#fff8e1",
    pupilColor: "#ff6f00",
    glowColor: "rgba(255, 179, 0, 0.4)",
    pattern: "rings",
    trailEffect: "gold",
    eyeStyle: "normal",
  },
  rgb_gamer: {
    id: "rgb_gamer",
    name: "RGB 144Hz Опариш",
    lore: "Опариш для PUBG на ультрах з динамічним RGB-підсвічуванням сегментів.",
    headColor: "#ff0055",
    bodyColors: ["#ff0055", "#9900ff", "#0088ff", "#00ff66", "#ffff00"],
    eyeColor: "#ffffff",
    pupilColor: "#00ffcc",
    glowColor: "rgba(255, 0, 128, 0.4)",
    pattern: "rainbow",
    trailEffect: "rainbow",
    eyeStyle: "cyborg",
  },
  void_hikka: {
    id: "void_hikka",
    name: "Безодня Хікікоморі",
    lore: "Повне занурення у вакуум темряви під ковдрою. Поглинає будь-яке світло.",
    headColor: "#050505",
    bodyColors: ["#0a0a0a", "#121316", "#050505", "#16181c"],
    eyeColor: "#ffffff",
    pupilColor: "#ff0000",
    glowColor: "rgba(255, 255, 255, 0.15)",
    pattern: "solid",
    trailEffect: "smoke",
    eyeStyle: "void",
  },
  infinix: {
    id: "infinix",
    name: "Infinix Hot 100°C",
    lore: "Опариш, розігрітий процесором бюджетного телефона під час 12-годинної сесії.",
    headColor: "#ff3d00",
    bodyColors: ["#ff5722", "#f4511e", "#e64a19", "#bf360c"],
    eyeColor: "#ffffff",
    pupilColor: "#ffea00",
    glowColor: "rgba(255, 61, 0, 0.4)",
    pattern: "striped",
    trailEffect: "fire",
    eyeStyle: "angry",
  },
  baklaga: {
    id: "baklaga",
    name: "6-Літрова Баклага",
    lore: "Стратегічний запас кришталевої води, принесений Подро з колонки.",
    headColor: "#00b0ff",
    bodyColors: ["#40c4ff", "#0091ea", "#80d8ff", "#0288d1"],
    eyeColor: "#ffffff",
    pupilColor: "#01579b",
    glowColor: "rgba(0, 176, 255, 0.35)",
    pattern: "rings",
    trailEffect: "cyber",
    eyeStyle: "normal",
  },
  shemet: {
    id: "shemet",
    name: "Зашеметований Барон",
    lore: "Опариш найвищого рангу поваги, що досяг просвітлення в клікері.",
    headColor: "#ffd700",
    bodyColors: ["#ffffff", "#ffd700", "#ffecb3", "#d4af37"],
    eyeColor: "#000000",
    pupilColor: "#ffd700",
    glowColor: "rgba(255, 215, 0, 0.45)",
    pattern: "striped",
    trailEffect: "gold",
    eyeStyle: "hypno",
  },
  toxic_carrot: {
    id: "toxic_carrot",
    name: "Радіаційна Морква",
    lore: "Велетенський шматок немитої моркви, насичений чистим вітаміном С-137.",
    headColor: "#ff6d00",
    bodyColors: ["#ff9100", "#ff6d00", "#ff3d00", "#dd2c00"],
    eyeColor: "#76ff03",
    pupilColor: "#000000",
    glowColor: "rgba(255, 109, 0, 0.4)",
    pattern: "striped",
    trailEffect: "fire",
    eyeStyle: "alien",
  },
  retro_pixel: {
    id: "retro_pixel",
    name: "Зелений Монітор CRT",
    lore: "Фосфорний ретро-опариш прямо з екрану старого лампового комп'ютера.",
    headColor: "#00e676",
    bodyColors: ["#00c853", "#69f0ae", "#00e676", "#1b5e20"],
    eyeColor: "#000000",
    pupilColor: "#69f0ae",
    glowColor: "rgba(0, 230, 118, 0.35)",
    pattern: "striped",
    trailEffect: "cyber",
    eyeStyle: "cyborg",
  },
  zebra: {
    id: "zebra",
    name: "Штрихкод Магазину",
    lore: "Опариш із найдешевшої пачки макаронів за 9.99 грн.",
    headColor: "#ffffff",
    bodyColors: ["#000000", "#ffffff", "#000000", "#ffffff"],
    eyeColor: "#ff0000",
    pupilColor: "#ffffff",
    glowColor: "rgba(255, 255, 255, 0.2)",
    pattern: "striped",
    trailEffect: "default",
    eyeStyle: "normal",
  },
};

export type FoodType = "bean" | "granule" | "drop" | "carrot" | "sadoczyk";

export interface FoodItem {
  id: number;
  x: number;
  y: number;
  radius: number;
  type: FoodType;
  value: number;
  color: string;
  glow?: string;
  pulsePhase: number;
  vx?: number;
  vy?: number;
}

export type BuffType = "magnet" | "ghost" | "turbo" | "multiplier" | "shockwave";

export interface PowerUpItem {
  id: number;
  x: number;
  y: number;
  radius: number;
  type: BuffType;
  durationMs: number;
  pulsePhase: number;
}

export interface ActiveBuff {
  type: BuffType;
  expiresAt: number;
  durationMs: number;
}

export interface Segment {
  x: number;
  y: number;
  radius: number;
}

export interface Maggot {
  id: string;
  name: string;
  isBot: boolean;
  isPlayer: boolean;
  skin: SkinId;
  x: number;
  y: number;
  angle: number;
  targetAngle: number;
  speed: number;
  baseSpeed: number;
  boostSpeed: number;
  isBoosting: boolean;
  score: number;
  coffeeEaten: number;
  kills: number;
  segments: Segment[];
  segmentSpacing: number;
  alive: boolean;
  lastBoostDropTime: number;
  turnRate: number;
  glowColor?: string;
  avatarUrl?: string;
  deathTime?: number;
  invulnerableUntil?: number;
  activeBuffs: ActiveBuff[];
  // Dead reckoning target
  targetX?: number;
  targetY?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: "trail" | "spark" | "coffee" | "blood" | "bubble" | "shockwave" | "smoke";
}

export interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
}

export interface KillFeedItem {
  id: string;
  killer: string;
  victim: string;
  time: number;
  killerSkin: SkinId;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  isPlayer?: boolean;
  isBot?: boolean;
  isLive?: boolean;
  skin: SkinId;
}

export interface GameStats {
  score: number;
  coffeeEaten: number;
  kills: number;
  timeAlive: number;
  peakRank: number;
  finalRank: number;
}

export interface RemotePlayerSync {
  id: string;
  name: string;
  skin: SkinId;
  x: number;
  y: number;
  angle: number;
  isBoosting: boolean;
  score: number;
  coffeeEaten: number;
  kills: number;
  activeBuffs: BuffType[];
  alive: boolean;
  t: number;
}

export interface RemoteDeathPayload {
  victimId: string;
  victimName: string;
  killerId?: string;
  killerName?: string;
  killerSkin: SkinId;
  x: number;
  y: number;
  score: number;
  droppedFoods: Array<{
    x: number;
    y: number;
    type: FoodType;
    value: number;
    vx: number;
    vy: number;
  }>;
  spawnPowerUp?: boolean;
}
