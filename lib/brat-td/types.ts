// Game type definitions — extracted from BratTDClient.tsx and gameConfig.ts

// ---- From gameConfig.ts (originally exported) ----

export interface PathPoint {
  x: number;
  y: number;
}

export interface Obstacle {
  x: number;
  y: number;
  radius: number;
  name: string;
  emoji: string;
  color: string;
  borderColor: string;
}

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
  maxMines?: number;
  mineExplodes?: boolean;
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
  // Fire DoT tower stats
  fireDoTDamage?: number;
  fireDoTDuration?: number;
  fireDoTMaxStacks?: number;
  antiRegenFactor?: number;
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
  maxMines?: number;
  mineExplodes?: boolean;
  fireDoTDamage?: number;
  fireDoTDuration?: number;
  fireDoTMaxStacks?: number;
  antiRegenFactor?: number;
}

export interface TowerConfig extends TowerStats {
  upgrades: {
    path1: Upgrade[];
    path2: Upgrade[];
    path3: Upgrade[];
  };
}

export type EnemyModifier = "camo" | "regen" | "lead" | "phantom" | "ceramic";

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
  onDeath?: (enemyX: number, enemyY: number, spawnEnemyCallback: (type: string, x: number, y: number, modifiers?: EnemyModifier[]) => void) => void;
  isCamo?: boolean;
  isRegen?: boolean;
  isLead?: boolean;
  isPhantomCamo?: boolean;
  isExploder?: boolean;
  isCeramic?: boolean;
  glitchDistance?: number;
  shieldHp?: number;
  shieldRegenDelay?: number;
  isHealer?: boolean;
  isFlying?: boolean;
  knockbackMultiplier?: number;
  tier?: number; // 1-5, scales stats
  stunImmune?: boolean;
  knockbackImmune?: boolean;
}

export type AchievementReward = {
  bonusStartGold?: number;
  bonusLives?: number;
  title?: string;
  frame?: string;
  effect?: string;
};

export type AchievementConfig = {
  id: string;
  name: string;
  description: string;
  reward: AchievementReward;
};

export interface WaveSegment {
  type: string;
  count: number;
  spawnDelay: number; // in milliseconds
  delayBeforeNext?: number; // wait before spawning next segment in same wave
  modifiers?: EnemyModifier[];
}

// ---- From BratTDClient.tsx (originally non-exported) ----

export interface PlacedTower {
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
  damageTaken?: number;
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
  // Fire DoT tower stats
  fireDoTDamage?: number;
  fireDoTDuration?: number;
  fireDoTMaxStacks?: number;
  antiRegenFactor?: number;
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
  prioritizeCamo?: boolean;
  prioritizeDrones?: boolean;
  angle?: number;
}

export interface ActiveEnemy {
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
  isCeramic?: boolean;
  shieldHp?: number;
  maxShieldHp?: number;
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
  isDying?: boolean;
  deathFrame?: number;
}

export interface Projectile {
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

export interface Particle {
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

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  size?: number;
  font?: string;
}

export interface SpeedTrail {
  x: number;
  y: number;
  radius: number;
  life: number;
}

export interface Mine {
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

export interface MineProjectile {
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

export interface LeaderboardEntry {
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

export type LeaderboardKind = "best_score" | "normal_wave" | "hard_wave" | "endless_wave" | "fastest_victory";

export type TowerMasteryProgress = {
  towerXp: number;
  unlockedTiers: string[];
  highestTierAchieved: number;
};

export type ProgressionState = {
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

export type AchievementToast = {
  id: string;
  name: string;
  description: string;
  reward: string;
};

export type SessionSummary = {
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

export type DifficultyKey = "easy" | "normal" | "hard";

export type ObstacleConfig = Obstacle;

export type RouteConfig = {
  id: string;
  name: string;
  points: PathPoint[];
};

export type MapGate = {
  x: number;
  y: number;
  label: string;
  color: string;
  isExit?: boolean;
};

export type MapDecorPatch = {
  x: number;
  y: number;
  r: number;
  color: string;
};

export type MapConfig = {
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

export type SceneTheme = {
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

export interface ExplosionRingDebris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface ExplosionRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
  coreLife: number;
  ringCount: number;
  debris: ExplosionRingDebris[];
}

