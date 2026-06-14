/**
 * Brat TD game engine — extracted from BratTDClient.tsx (Task 8).
 *
 * Pure-extraction refactor: identical behavior, functions take a shared
 * `EngineContext` object that bundles refs, setters, and helpers so the
 * game loop, wave spawner, projectile collisions, mine explosions, buffs,
 * and cosmetic effects can be called from outside the React component.
 *
 * The orchestration entry point is `updateGame()`, which is the per-frame
 * state-mutator that runs every animation frame. It calls the sub-systems
 * defined here in the same order as the original useEffect body.
 */

import {
  ARRAY_CAPS,
  COFFEE_BUFF_DEFAULTS,
  EMOJI_MAP,
  GAME_HEIGHT,
  GAME_WIDTH,
  HEALER_BASE_HEAL,
  HEALER_HP_SCALING,
  MAX_DAMAGE_DEBUFF_MULTIPLIER,
  MAX_OVERHEAL_MULTIPLIER,
  SHIELD_REGEN_DELAY_FRAMES,
  TIER_SCALING,
  ANTI_AIR_TOWERS,
  getEnemyStatsForWave,
  getScaledWave,
  getWaveQuote,
} from "@/app/(main)/tools/brat-td/gameConfig";
import { SoundEvent } from "@/lib/brat-td/audio";
import { calculateTowerBuffs } from "./pure";
import type {
  ActiveEnemy,
  EnemyModifier,
  FloatingText,
  MapConfig,
  Mine,
  MineProjectile,
  Particle,
  PlacedTower,
  ProgressionState,
  Projectile,
  RouteConfig,
  SpeedTrail,
} from "@/lib/brat-td/types";

// ─────────────────────────────────────────────────────────────────────────
//  Refs bundle — all `useRef<...>` instances from BratTDClient passed in.
//  These are mutated in place. The engine never replaces the .current
//  values wholesale; it mutates the arrays/objects the refs hold.
// ─────────────────────────────────────────────────────────────────────────

export interface EngineRefs {
  frameCountRef: { current: number };
  towersRef: { current: PlacedTower[] };
  enemiesRef: { current: ActiveEnemy[] };
  projectilesRef: { current: Projectile[] };
  mineProjectilesRef: { current: MineProjectile[] };
  particlesRef: { current: Particle[] };
  floatingTextsRef: { current: FloatingText[] };
  speedTrailsRef: { current: SpeedTrail[] };
  minesRef: { current: Mine[] };
  livesRef: { current: number };
  goldRef: { current: number };
  waveRef: { current: number };
  isWaveActiveRef: { current: boolean };
  gameStatusRef: { current: "idle" | "playing" | "gameover" | "victory" };
  isPausedRef: { current: boolean };
  gameSpeedRef: { current: 1 | 2 | 3 };
  isAutoStartRef: { current: boolean };
  scoreRef: { current: number };
  screenShakeRef: { current: { x: number; y: number; intensity: number; duration: number } };
  projectileTrailRef: { current: { x: number; y: number; color: string; alpha: number; size: number }[] };
  explosionRingsRef: {
    current: {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      color: string;
      life: number;
      coreLife: number;
      ringCount: number;
      debris: { x: number; y: number; vx: number; vy: number; size: number; life: number; maxLife: number; color: string }[];
    }[];
  };
  waveAnnouncementRef: { current: { wave: number; frameStart: number } | null };
  spawnQueueRef: { current: { type: string; delay: number; modifiers?: EnemyModifier[]; routeId?: string }[] };
  spawnTimerRef: { current: number };
  waveTotalEnemiesRef: { current: number };
  waveTotalHpRef: { current: number };
  waveStartLivesRef: { current: number };
  waveKillsRef: { current: number };
  sessionSeedRef: { current: number };
  progressionRef: { current: ProgressionState };
  settingsRef: { current: { particles: boolean; effectLimits: boolean; screenShake: boolean } };
  difficultyRef: { current: "easy" | "normal" | "hard" };
  selectedMapIdRef: { current: string };
  // Mutable mid-frame buffer for wave-clear notifications that need to
  // trigger side-effects (achievements, victory). Filled by `updateGame`,
  // drained by the React layer between frames.
  pendingEventsRef: { current: EnginePendingEvent[] };
}

export type EnginePendingEvent =
  | { kind: "wave_cleared"; wave: number; finalBonus: number; clearBonus: number; bonusGold: number; perfectWave: boolean; earnedAchievements: string[]; isEndless: boolean }
  | { kind: "victory"; wave: number }
  | { kind: "gameover" }
  | { kind: "next_wave"; wave: number }
  | { kind: "log"; message: string };

// ─────────────────────────────────────────────────────────────────────────
//  Callbacks — setters and pure helpers. The React layer wires these
//  once. The engine treats them as opaque side-effect sinks.
// ─────────────────────────────────────────────────────────────────────────

export interface EngineCallbacks {
  // React state setters (kept as callbacks for compatibility with the
  // batching behavior the original component relied on).
  setLives: (updater: (prev: number) => number) => void;
  setGold: (updater: (prev: number) => number) => void;
  setScore: (updater: (prev: number) => number) => void;
  setWave: (value: number) => void;
  setIsWaveActive: (value: boolean) => void;
  setGameStatus: (value: "idle" | "playing" | "gameover" | "victory") => void;

  // Notification helpers
  pushLog: (msg: string) => void;
  emitSound: (event: SoundEvent, towerType?: string) => void;

  // Progression side-effects
  addPlayerXp: (rawXp: number) => void;
  addTowerXp: (towerType: string, amount: number) => void;
  addTowerXpById: (towerId: string | undefined, amount: number) => void;
  awardAchievements: (ids: string[]) => void;
  markCurrentMapCompleted: () => void;
  buildSessionSummary: () => void;
  startNextWave: () => void;
  spawnEnemyCallback: (type: string, x: number, y: number, modifiers?: EnemyModifier[], routeId?: string) => void;

  // Pure helpers
  getActiveMap: () => MapConfig;
  getRouteById: (map: MapConfig, routeId: string) => RouteConfig;
  getWaveRouteIds: (map: MapConfig, wave: number) => string[];
  getNonEndlessWaveClearReward: (wave: number) => number;
  getEnemyRoute: (enemy: ActiveEnemy) => RouteConfig;
  getEffectiveTowerRange: (tower: PlacedTower) => number;
  getEffectiveTowerDamage: (tower: PlacedTower) => number;
  applyDamageDebuffCap: (current: number | undefined, incoming: number) => number;
  getDistance: (x1: number, y1: number, x2: number, y2: number) => number;
  getRouteDistancePosition: (
    points: { x: number; y: number }[],
    distance: number
  ) => { x: number; y: number; pathIndex: number };
  applyDifficultyToEnemy: <T extends { hp: number; maxHp?: number; speed: number; reward: number; damage: number; shieldHp?: number; maxShieldHp?: number }>(enemy: T) => T;
  isSupportTowerType: (type: string) => boolean;
  spawnHitParticles: (x: number, y: number, color: string, count?: number, shape?: "circle" | "square") => void;
  spawnFloatingText: (x: number, y: number, text: string, color?: string, size?: number, font?: string) => void;

  // Context flag — does this run on the endless map?
  isEndless: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
//  Convenience aggregate: `EngineContext` = refs + callbacks. Constructed
//  once by the React component and passed to every engine function.
// ─────────────────────────────────────────────────────────────────────────

export interface EngineContext {
  refs: EngineRefs;
  cb: EngineCallbacks;
}

// ─────────────────────────────────────────────────────────────────────────
//  Pure helpers (re-exported from the original component body)
// ─────────────────────────────────────────────────────────────────────────

const getPureRandom = () => Math.random();
const getPureId = () => Math.random().toString(36).substr(2, 9);

const pushWithCap = <T,>(arr: T[], items: T | T[], cap: number) => {
  const itemList = Array.isArray(items) ? items : [items];
  while (arr.length + itemList.length > cap && arr.length > 0) arr.shift();
  arr.push(...itemList);
};

// ─────────────────────────────────────────────────────────────────────────
//  Sub-systems — extracted as named functions. Each mutates `ctx.refs` and
//  calls into `ctx.cb` for side effects. Pure extraction: identical body.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Caps a damage debuff multiplier. Repeated applications keep the strongest
 * effect but never push it below the cap (which would heal enemies).
 */
export function applyDamageDebuffCap(current: number | undefined, incoming: number): number {
  return Math.min(MAX_DAMAGE_DEBUFF_MULTIPLIER, Math.max(current || 1.0, incoming));
}

/**
 * Applies Nescafe Ritual / Bankomat aura buffs to nearby towers. Also drips
 * a small XP reward to support towers every 60 frames while a wave is live.
 */
export function updateCoffeeBuffs(ctx: EngineContext): void {
  const towers = ctx.refs.towersRef.current;
  calculateTowerBuffs(towers, { getDistance: ctx.cb.getDistance });
  if (ctx.refs.isWaveActiveRef.current && ctx.refs.frameCountRef.current % 60 === 0) {
    for (const supportTower of towers) {
      if (!ctx.cb.isSupportTowerType(supportTower.type)) continue;
      for (const tower of towers) {
        if (tower.id === supportTower.id) continue;
        if (ctx.cb.getDistance(tower.x, tower.y, supportTower.x, supportTower.y) <= supportTower.range) {
          ctx.cb.addTowerXp(supportTower.type, 0.1);
        }
      }
    }
  }
}

/**
 * Spawns cosmetic effect particles based on the active title effect frame
 * ("golden_glow", "frost_trail", "fire_trail", "neon_pulse"). No-op when
 * particles are disabled in settings or no effect is active.
 */
export function spawnCosmeticParticles(ctx: EngineContext): void {
  const effect = ctx.refs.progressionRef.current.activeEffect;
  if (!effect) return;
  if (!ctx.refs.settingsRef.current.particles) return;

  const cap = ARRAY_CAPS.PARTICLES * (ctx.refs.settingsRef.current.effectLimits ? 1 : 2);
  const frame = ctx.refs.frameCountRef.current;

  switch (effect) {
    case "golden_glow": {
      if (frame % 6 !== 0) break;
      ctx.refs.towersRef.current.forEach((tower) => {
        for (let i = 0; i < 2; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 16 + Math.random() * 8;
          pushWithCap(ctx.refs.particlesRef.current, {
            x: tower.x + Math.cos(angle) * dist,
            y: tower.y + Math.sin(angle) * dist,
            vx: Math.cos(angle) * 0.3,
            vy: -Math.random() * 0.5 - 0.2,
            color: "#FFD700",
            size: Math.random() * 2.5 + 1.5,
            life: 35,
            maxLife: 35
          }, cap);
        }
      });
      break;
    }
    case "frost_trail": {
      if (frame % 4 !== 0) break;
      ctx.refs.enemiesRef.current.forEach((enemy) => {
        if (enemy.hp <= 0) return;
        pushWithCap(ctx.refs.particlesRef.current, {
          x: enemy.x + (Math.random() - 0.5) * 6,
          y: enemy.y + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          color: "#87CEEB",
          size: Math.random() * 2.5 + 1.5,
          life: 25,
          maxLife: 25
        }, cap);
      });
      break;
    }
    case "fire_trail": {
      if (frame % 3 !== 0) break;
      ctx.refs.enemiesRef.current.forEach((enemy) => {
        if (enemy.hp <= 0) return;
        pushWithCap(ctx.refs.particlesRef.current, {
          x: enemy.x + (Math.random() - 0.5) * 8,
          y: enemy.y,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -Math.random() * 1.2 - 0.4,
          color: "#FF6B35",
          size: Math.random() * 2.5 + 1.5,
          life: 20,
          maxLife: 20
        }, cap);
      });
      break;
    }
    case "neon_pulse": {
      if (frame % 8 !== 0) break;
      ctx.refs.towersRef.current.forEach((tower) => {
        const count = 3;
        for (let i = 0; i < count; i++) {
          const angle = (frame * 0.05 + (i * Math.PI * 2) / count) % (Math.PI * 2);
          pushWithCap(ctx.refs.particlesRef.current, {
            x: tower.x + Math.cos(angle) * 20,
            y: tower.y + Math.sin(angle) * 20,
            vx: Math.cos(angle) * 0.5,
            vy: Math.sin(angle) * 0.5,
            color: "#00FF00",
            size: Math.random() * 2 + 2,
            life: 30,
            maxLife: 30
          }, cap);
        }
      });
      break;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  Wave spawner
// ─────────────────────────────────────────────────────────────────────────

/**
 * Builds the spawn queue for the next wave, interleaving gas_brat and
 * healer enemies evenly, then flips the `isWaveActive` flag. Pure
 * extraction: identical to the inline component code.
 */
export function startNextWave(ctx: EngineContext): void {
  const refs = ctx.refs;
  if (refs.isWaveActiveRef.current || refs.gameStatusRef.current !== "playing") return;

  const segments = getScaledWave(refs.waveRef.current, refs.sessionSeedRef.current);
  const activeMap = ctx.cb.getActiveMap();
  const activeRouteIds = ctx.cb.getWaveRouteIds(activeMap, refs.waveRef.current);

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

  // Interleave gas_brat and healer enemies evenly throughout the queue
  const INTERLEAVE_TYPES = new Set(["gas_brat", "healer"]);
  const interleaved: typeof queue = [];
  const mainQueue: typeof queue = [];
  for (const entry of queue) {
    if (entry.type && INTERLEAVE_TYPES.has(entry.type)) {
      interleaved.push(entry);
    } else {
      mainQueue.push(entry);
    }
  }
  if (interleaved.length > 0 && mainQueue.length > 0) {
    const mainEnemyCount = mainQueue.filter((e) => e.type).length;
    if (mainEnemyCount > 0) {
      const step = mainEnemyCount / (interleaved.length + 1);
      let insertIdx = 0;
      let placed = 0;
      let enemyCount = 0;
      for (let i = 0; i < mainQueue.length; i++) {
        if (mainQueue[i].type) enemyCount++;
        while (placed < interleaved.length && enemyCount >= Math.ceil(step * (placed + 1))) {
          insertIdx = i + 1 + placed;
          placed++;
        }
      }
      // Rebuild: insert interleaved entries at calculated positions
      const result: typeof queue = [];
      let interleavedIdx = 0;
      enemyCount = 0;
      for (let i = 0; i < mainQueue.length; i++) {
        result.push(mainQueue[i]);
        if (mainQueue[i].type) {
          enemyCount++;
          while (interleavedIdx < interleaved.length && enemyCount >= Math.ceil(step * (interleavedIdx + 1))) {
            result.push(interleaved[interleavedIdx]);
            interleavedIdx++;
          }
        }
      }
      // Append any remaining interleaved entries
      while (interleavedIdx < interleaved.length) {
        result.push(interleaved[interleavedIdx]);
        interleavedIdx++;
      }
      refs.spawnQueueRef.current = result;
    } else {
      refs.spawnQueueRef.current = [...interleaved];
    }
  } else {
    refs.spawnQueueRef.current = queue;
  }

  refs.waveStartLivesRef.current = refs.livesRef.current;
  refs.waveKillsRef.current = 0;
  refs.spawnTimerRef.current = 0;
  const totalEnemies = segments.reduce((sum, s) => sum + s.count, 0);
  refs.waveTotalEnemiesRef.current = totalEnemies;
  refs.waveTotalHpRef.current = segments.reduce((sum, s) => sum + getEnemyStatsForWave(s.type, refs.waveRef.current, s.modifiers).hp * s.count, 0);
  ctx.cb.setIsWaveActive(true);
  refs.isWaveActiveRef.current = true;
  refs.waveAnnouncementRef.current = { wave: refs.waveRef.current, frameStart: refs.frameCountRef.current };
  ctx.cb.emitSound(SoundEvent.WAVE_START);

  const routeNotice = activeRouteIds.length > 1
    ? ` Маршрути: ${activeRouteIds.map((id) => ctx.cb.getRouteById(activeMap, id).name).join(" / ")}.`
    : "";
  ctx.cb.pushLog(`${getWaveQuote(refs.waveRef.current)}${routeNotice}`);

  if (refs.waveRef.current === 16) {
    ctx.cb.pushLog("🔩 Хвиля 16: Свинцеві вороги (🔩)! Звичайні молотки не пробивають їх. Використовуйте Газ, Infinix, Цукерки, або Молот T1P4 ('Руйнівник граніту').");
  } else if (refs.waveRef.current === 24) {
    ctx.cb.pushLog("💗 Хвиля 24: Регенеративні вороги (💗)! Вони швидко відновлюють здоров'я. Потрібна висока швидкість атаки (напр. Молот T2) або уповільнення (Цукерки).");
  } else if (refs.waveRef.current === 20) {
    ctx.cb.pushLog("⚠️ Хвиля 20: Інфінікс-Брати (👾) та Камуфляжні (🦹)! Вони лагають реальність і невидимі для звичайних веж. Використовуйте Infinix або апгрейди з виявленням камуфляжу.");
  } else if (refs.waveRef.current === 28) {
    ctx.cb.pushLog("🍬 Хвиля 28: Рачкові та Газові Брати (🍬💨)! Вони прискорюють союзників та уповільнюють ваші башні.");
  } else if (refs.waveRef.current === 32) {
    ctx.cb.pushLog("🗿 Хвиля 32: Гранітні, Фантоми та Вибухові Брати! Граніт має 75% броню, Фантоми невидимі навіть для сканерів.");
  } else if (refs.waveRef.current === 36) {
    ctx.cb.pushLog("🦘🛡️ Хвиля 36: Стрибуни та Щитові Брати! Стрибуни телепортуються на 100px, Щитові мають регенеруючий щит.");
  } else if (refs.waveRef.current === 41) {
    ctx.cb.pushLog("💀 КОМБО #1 (Camo+Lead): Невидимі + імунні до молотків! Потрібні башні з камуфляж-детекцією, що б'ють не молотком.");
  } else if (refs.waveRef.current === 42) {
    ctx.cb.pushLog("💀 КОМБО #2 (Regen+Phantom): Регенерація + супер-камуфляж! Вороги зцілюються і невидимі навіть для сканерів.");
  } else if (refs.waveRef.current === 43) {
    ctx.cb.pushLog("💀 КОМБО #3 (Shielded+Exploder): Щит + вибух при смерті! Вибух оглушує башні, щит захищає від першого удару.");
  } else if (refs.waveRef.current === 44) {
    ctx.cb.pushLog("💀 КОМБО #4 (Granite+Lead): Подвійна броня! Граніт -75% фіз. шкоди, Свинець - повний імунітет до молотків.");
  } else if (refs.waveRef.current === 45) {
    ctx.cb.pushLog("💀 КОМБО #5 (Jumper+Regen): Телепорт + регенерація! Вороги стрибають вперед і зцілюються.");
  } else if (refs.waveRef.current === 46) {
    ctx.cb.pushLog("👹 ФІНАЛЬНИЙ КОМБО-БОС: ВСІ СИНЕРГІЇ! Удачі...");
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  Per-frame sub-systems — each matches a numbered section of the
//  original `updateGame` body. Pure extraction, identical behavior.
// ─────────────────────────────────────────────────────────────────────────

/** Section 1: spawn queue drain, wave-clear handling. */
function processSpawningAndWaveClear(ctx: EngineContext): void {
  const refs = ctx.refs;
  if (!refs.isWaveActiveRef.current) return;

  if (refs.spawnQueueRef.current.length > 0) {
    refs.spawnTimerRef.current += 16.67; // approx ms per frame
    const nextSpawn = refs.spawnQueueRef.current[0];
    if (refs.spawnTimerRef.current >= nextSpawn.delay) {
      refs.spawnTimerRef.current = 0;
      refs.spawnQueueRef.current.shift(); // remove from queue

      if (nextSpawn.type) {
        // Actually spawn the enemy
        const baseConfig = getEnemyStatsForWave(nextSpawn.type, refs.waveRef.current, nextSpawn.modifiers);
        const activeMap = ctx.cb.getActiveMap();
        const route = ctx.cb.getRouteById(activeMap, nextSpawn.routeId ?? ctx.cb.getWaveRouteIds(activeMap, refs.waveRef.current)[0]);
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
          isCeramic: baseConfig.isCeramic,
          isPhantomCamo: baseConfig.isPhantomCamo,
          isExploder: baseConfig.isExploder,
          isHealer: baseConfig.isHealer,
          isFlying: baseConfig.isFlying,
          shieldHp: baseConfig.shieldHp,
          maxShieldHp: baseConfig.shieldHp,
          tier: baseConfig.tier,
          damageReduce: baseConfig.tier ? TIER_SCALING[baseConfig.tier - 1]?.damageReduce ?? 0 : 0,
          stunImmune: baseConfig.stunImmune,
          knockbackImmune: baseConfig.knockbackImmune
        };

        refs.enemiesRef.current.push(ctx.cb.applyDifficultyToEnemy(newEnemy));
      }
    }
  } else if (refs.enemiesRef.current.length === 0) {
    // Wave clear!
    handleWaveCleared(ctx);
  }
}

function handleWaveCleared(ctx: EngineContext): void {
  const refs = ctx.refs;
  const clearedWave = refs.waveRef.current;
  refs.isWaveActiveRef.current = false;
  ctx.cb.setIsWaveActive(false);

  // Apply Nescafe Ritual end of wave bonuses
  let bonusGold = 0;
  refs.towersRef.current.forEach((t) => {
    if (t.endOfWaveBonus) {
      bonusGold += t.endOfWaveBonus;
    }
  });
  const isEndless = ctx.cb.isEndless;
  const clearBonus = isEndless ? 0 : ctx.cb.getNonEndlessWaveClearReward(clearedWave);
  const finalBonus = bonusGold + clearBonus;
  if (finalBonus > 0) {
    ctx.cb.setGold((prev) => prev + finalBonus);
  }
  ctx.cb.setScore((prev) => prev + clearedWave * 50);
  const perfectWave = refs.livesRef.current >= refs.waveStartLivesRef.current;
  ctx.cb.addPlayerXp((clearedWave * 15 + refs.waveKillsRef.current * 3 + (clearedWave === 46 ? 1000 : 0)) * (perfectWave ? 1.5 : 1));

  const earnedAchievements: string[] = [];
  if (clearedWave >= 1) earnedAchievements.push("first_wave");
  if (clearedWave >= 10) earnedAchievements.push("wave_10");
  if (clearedWave >= 20) earnedAchievements.push("wave_20");
  if (clearedWave >= 30) earnedAchievements.push("wave_30");
  if (clearedWave >= 40) earnedAchievements.push("wave_40");
  if (clearedWave >= 46) earnedAchievements.push("wave_46");
  if (clearedWave >= 46 && refs.difficultyRef.current === "hard") earnedAchievements.push("hard_mode");
  if (clearedWave >= 70 && isEndless) earnedAchievements.push("endless_70");
  ctx.cb.awardAchievements(earnedAchievements);

  ctx.cb.pushLog(finalBonus > 0
    ? `Накат братви відбито! +${finalBonus} ☕ (${clearBonus ? `хвиля ${clearBonus}` : ""}${clearBonus && bonusGold ? " + " : ""}${bonusGold ? `економіка ${bonusGold}` : ""}).`
    : "Накат братви відбито!");

  // Record pending event for the React layer to drain between frames.
  refs.pendingEventsRef.current.push({
    kind: "wave_cleared",
    wave: clearedWave,
    finalBonus,
    clearBonus,
    bonusGold,
    perfectWave,
    earnedAchievements,
    isEndless,
  });

  // Check victory conditions (after wave 46)
  if (clearedWave === 46 && !isEndless) {
    ctx.cb.markCurrentMapCompleted();
    refs.gameStatusRef.current = "victory";
    ctx.cb.setGameStatus("victory");
    setTimeout(() => ctx.cb.buildSessionSummary(), 0);
  } else {
    const nextWave = clearedWave + 1;
    refs.waveRef.current = nextWave;
    ctx.cb.setWave(nextWave);
    if (refs.isAutoStartRef.current) {
      setTimeout(() => ctx.cb.startNextWave(), 1000);
    }
  }
}

/** Section 2: tick down cosmetic systems (trails, particles, texts, rings). */
function tickCosmeticSystems(ctx: EngineContext): void {
  const refs = ctx.refs;

  // Trails
  refs.speedTrailsRef.current = refs.speedTrailsRef.current
    .map((trail) => ({ ...trail, life: trail.life - 1 }))
    .filter((trail) => trail.life > 0);

  // Particles
  refs.particlesRef.current = refs.particlesRef.current
    .map((p) => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      life: p.life - 1
    }))
    .filter((p) => p.life > 0);

  // Floating texts
  refs.floatingTextsRef.current = refs.floatingTextsRef.current
    .map((ft) => ({
      ...ft,
      y: ft.y - 0.4,
      life: ft.life - 1
    }))
    .filter((ft) => ft.life > 0);

  // Projectile trails
  refs.projectileTrailRef.current = refs.projectileTrailRef.current
    .map(t => ({ ...t, alpha: t.alpha - 0.03, size: t.size * 0.95 }))
    .filter(t => t.alpha > 0);

  // Explosion rings
  refs.explosionRingsRef.current = refs.explosionRingsRef.current
    .map(r => ({
      ...r,
      radius: r.radius + 3,
      life: r.life - 1,
      coreLife: r.coreLife - 1,
      debris: r.debris.map(d => ({
        ...d,
        x: d.x + d.vx,
        y: d.y + d.vy,
        vx: d.vx * 0.95,
        vy: d.vy * 0.95,
        life: d.life - 1,
      })).filter(d => d.life > 0),
    }))
    .filter(r => r.life > 0);
}

/** Section 3: enemy movement, regen, healing, mine triggers, special abilities. */
function processEnemies(ctx: EngineContext): void {
  const refs = ctx.refs;
  for (let i = refs.enemiesRef.current.length - 1; i >= 0; i--) {
    const enemy = refs.enemiesRef.current[i];

    let activeAntiRegen = 0;

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

    // Process Fire DoT Stacks
    if (enemy.fireDoTStacks && enemy.fireDoTStacks.length > 0) {
      let totalTickDamage = 0;
      for (let sIdx = enemy.fireDoTStacks.length - 1; sIdx >= 0; sIdx--) {
        const stack = enemy.fireDoTStacks[sIdx];
        stack.duration--;
        if (stack.duration % 60 === 0) {
          const tickDmg = stack.damage / (stack.maxDuration / 60);
          totalTickDamage += tickDmg;
        }
        if (stack.antiRegenFactor > activeAntiRegen) {
          activeAntiRegen = stack.antiRegenFactor;
        }
        if (stack.duration <= 0) {
          enemy.fireDoTStacks.splice(sIdx, 1);
        }
      }
      if (totalTickDamage > 0) {
        enemy.hp -= totalTickDamage;
        ctx.cb.spawnFloatingText(enemy.x + (getPureRandom() - 0.5) * 10, enemy.y - 15, `🔥 -${totalTickDamage.toFixed(1)}`, "#f97316", 13);
        ctx.cb.spawnHitParticles(enemy.x, enemy.y, "#f97316", 2);
      }
    }

    // Shield regeneration for shielded enemies
    if (enemy.shieldHp !== undefined && enemy.shieldHp <= 0) {
      if (enemy.shieldRegenTimer === undefined) enemy.shieldRegenTimer = SHIELD_REGEN_DELAY_FRAMES;
      enemy.shieldRegenTimer--;
      if (enemy.shieldRegenTimer <= 0) {
        enemy.shieldHp = enemy.maxShieldHp || 80; // Regenerate shield
        enemy.shieldRegenTimer = undefined;
        ctx.cb.spawnFloatingText(enemy.x, enemy.y - 20, "🛡️ ЩИТ!", "#0ea5e9");
      }
    }

    // Check if standing on speed trail (sweet pink candy dust)
    let standingOnTrail = false;
    for (const trail of refs.speedTrailsRef.current) {
      if (ctx.cb.getDistance(enemy.x, enemy.y, trail.x, trail.y) < trail.radius) {
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
      const route = ctx.cb.getEnemyRoute(enemy);
      const target = route.points[enemy.pathIndex];
      if (!target) {
        refs.enemiesRef.current.splice(i, 1);
        continue;
      }
      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      const dist = ctx.cb.getDistance(enemy.x, enemy.y, target.x, target.y);

      if (dist <= currentSpeed) {
        // Snap to checkpoint
        enemy.x = target.x;
        enemy.y = target.y;
        enemy.pathIndex++;

        if (enemy.pathIndex >= route.points.length) {
          // Reached the end: player loses lives
          ctx.cb.setLives((prev) => {
            const newLives = Math.max(0, prev - enemy.damage);
            if (newLives <= 0) {
              refs.gameStatusRef.current = "gameover";
              ctx.cb.setGameStatus("gameover");
              setTimeout(() => ctx.cb.buildSessionSummary(), 0);
              ctx.cb.pushLog("Кодло не вивезло. Братва прорвала оборону.");
            }
            return newLives;
          });

          // Red glowing explosion at the end
          ctx.cb.spawnHitParticles(enemy.x - 20, enemy.y, "#ef4444", 12);
          refs.enemiesRef.current.splice(i, 1);
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
      const regenAmount = (HEALER_BASE_HEAL + enemy.maxHp * HEALER_HP_SCALING) * (1 - activeAntiRegen);
      if (regenAmount > 0) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + regenAmount);
      }
    }

    // Healer: heals nearby allies (flat + % scaling, allows overhealing up to 150% of ally's max HP)
    if (enemy.isHealer && enemy.hp > 0 && enemy.freezeDuration <= 0) {
      const healAmount = 0.08 + enemy.maxHp * 0.00008;
      refs.enemiesRef.current.forEach((ally) => {
        const maxOverheal = ally.maxHp * MAX_OVERHEAL_MULTIPLIER;
        if (ally.id !== enemy.id && ally.hp > 0 && ally.hp < maxOverheal && ctx.cb.getDistance(enemy.x, enemy.y, ally.x, ally.y) <= 80) {
          let allyAntiRegen = 0;
          if (ally.fireDoTStacks) {
            for (const stack of ally.fireDoTStacks) {
              if (stack.antiRegenFactor > allyAntiRegen) {
                allyAntiRegen = stack.antiRegenFactor;
              }
            }
          }
          const actualHeal = healAmount * (1 - allyAntiRegen);
          if (actualHeal > 0) {
            ally.hp = Math.min(maxOverheal, ally.hp + actualHeal);
          }
        }
      });
    }

    // Check mines
    for (let mi = refs.minesRef.current.length - 1; mi >= 0; mi--) {
      const mine = refs.minesRef.current[mi];
      if (enemy.isFlying) continue; // flying enemies ignore mines
      if (ctx.cb.getDistance(enemy.x, enemy.y, mine.x, mine.y) <= mine.triggerRadius) {
        // Camo mines only trigger on camo enemies if the tower can see camo
        if ((enemy.isCamo || enemy.isPhantomCamo) && !mine.camoDetection) continue;

        if (mine.explodes) {
          // Exploding mine: AoE blast and then destroyed
          ctx.cb.spawnHitParticles(mine.x, mine.y, "#ef4444", 15, "square");
          ctx.cb.spawnFloatingText(mine.x, mine.y - 15, "💥 МІНА!", "#ef4444");

          let hitCount = 0;
          refs.enemiesRef.current.forEach((e) => {
            if (e.hp <= 0 || hitCount >= mine.pierce) return;
            if (e.isFlying) return;
            if ((e.isCamo || e.isPhantomCamo) && !mine.camoDetection) return;
            if (ctx.cb.getDistance(e.x, e.y, mine.x, mine.y) <= mine.radius) {
              applyMineDamage(ctx, e, mine);
              hitCount++;
            }
          });

          refs.minesRef.current.splice(mi, 1);
          if (refs.settingsRef.current.screenShake) refs.screenShakeRef.current = { x: 0, y: 0, intensity: 3, duration: 5 };
          ctx.cb.emitSound(SoundEvent.EXPLOSION);
        } else {
          // Stacking trap: damages each enemy once, loses durability
          if (!mine.hitEnemyIds.includes(enemy.id)) {
            const dmg = applyMineDamage(ctx, enemy, mine);
            mine.hitEnemyIds.push(enemy.id);
            mine.pierce--;
            ctx.cb.spawnHitParticles(enemy.x, enemy.y, "#ef4444", 5, "square");
            ctx.cb.spawnFloatingText(enemy.x, enemy.y - 10, `-${dmg}`, "#ef4444");
            if (mine.pierce <= 0) {
              refs.minesRef.current.splice(mi, 1);
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
        const route = ctx.cb.getEnemyRoute(enemy);
        while (warpRemaining > 0 && enemy.pathIndex < route.points.length) {
          const target = route.points[enemy.pathIndex];
          const wdist = ctx.cb.getDistance(enemy.x, enemy.y, target.x, target.y);
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
        ctx.cb.spawnHitParticles(enemy.x, enemy.y, "#d8b4fe", 10, "square");
      }
    }

    // Spawning speed trail for Rachky-brat
    if (enemy.isSpawningTrail && !((enemy.abilitiesDisabledDuration || 0) > 0) && getPureRandom() < 0.15) {
      const trailCap = ARRAY_CAPS.SPEED_TRAILS * (refs.settingsRef.current.effectLimits ? 1 : 2);
      pushWithCap(refs.speedTrailsRef.current, {
        x: enemy.x,
        y: enemy.y,
        radius: 40,
        life: 120 // 2 seconds
      }, trailCap);
    }
  }
}

function applyMineDamage(ctx: EngineContext, target: ActiveEnemy, mine: Mine): number {
  let dmg = mine.damage;
  if (mine.explodes && (target.isLead || target.isCeramic)) {
    dmg = Math.floor(dmg * 1.5);
  }
  if (mine.ignoresArmor) { /* no reduction */ }
  else if (target.isSuperArmored && !mine.ignoresArmor) dmg = Math.floor(dmg * (1 - 0.75 * (1 - (mine.armorPierce || 0))));
  else if (target.isArmored && !mine.ignoresArmor) dmg = Math.floor(dmg * (1 - 0.5 * (1 - (mine.armorPierce || 0))));
  if (target.damageReduce) dmg = Math.floor(dmg * (1 - target.damageReduce));
  if (dmg <= 0) return 0;
  target.hp -= dmg;
  ctx.cb.addTowerXpById(mine.towerId, dmg * 0.02);
  if (mine.slowAmount) {
    target.gasSlowDuration = Math.max(target.gasSlowDuration || 0, 60);
    target.gasSlowFactor = Math.max(target.gasSlowFactor || 0, mine.slowAmount);
  }
  if (mine.freezeChance && !target.stunImmune && !(target.freezeDuration > 0) && getPureRandom() < mine.freezeChance) {
    target.freezeDuration = mine.freezeDuration || 60;
  }
  if (mine.disableAbilities) { target.isGlitching = false; }
  if (mine.damageDebuff) target.damageDebuff = ctx.cb.applyDamageDebuffCap(target.damageDebuff, mine.damageDebuff);
  if (target.hp <= 0) {
    const sourceTower = ctx.refs.towersRef.current.find(t => t.id === mine.towerId);
    if (sourceTower) sourceTower.totalKills++;
  }
  return dmg;
}

/** Section 4: tower buffs, target selection, firing. */
function processTowers(ctx: EngineContext): void {
  const refs = ctx.refs;
  // Pre-calculate Nescafe Ritual buffs on nearby towers
  updateCoffeeBuffs(ctx);

  const towers = refs.towersRef.current;
  towers.forEach((tower) => {
    if (refs.isWaveActiveRef.current && refs.frameCountRef.current % 60 === 0) {
      ctx.cb.addTowerXp(tower.type, 0.5);
    }
    // Check if affected by Gas Brat debuff (slow attack rate)
    let speedDebuff = 1.0;
    refs.enemiesRef.current.forEach((enemy) => {
      if (enemy.isSlowingTowers) {
        const dist = ctx.cb.getDistance(tower.x, tower.y, enemy.x, enemy.y);
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
    if (ctx.cb.isSupportTowerType(tower.type) || tower.damage <= 0) return;

    // Кладмен throws mines onto the path
    if (tower.type === "kladmen") {
      if (tower.cooldown <= 0) {
        tower.cooldown = tower.fireRate * 60;
        const effectiveRange = ctx.cb.getEffectiveTowerRange(tower);

        // Find a path segment within range
        const maxMines = tower.maxMines ?? 20;
        const placedMines = refs.minesRef.current.filter(m => m.towerId === tower.id).length;
        const flyingMines = refs.mineProjectilesRef.current.filter(p => p.towerId === tower.id).length;
        if (placedMines + flyingMines < maxMines) {
          // Collect all valid path points within range
          const validPoints: { x: number; y: number }[] = [];
          ctx.cb.getActiveMap().routes.forEach((route) => {
            for (let pi = 0; pi < route.points.length - 1; pi++) {
              const a = route.points[pi], b = route.points[pi + 1];
              const segLen = Math.hypot(b.x - a.x, b.y - a.y);
              const step = Math.max(6, segLen / 10);
              const steps = Math.ceil(segLen / step);
              for (let si = 0; si <= steps; si++) {
                const t = si / steps;
                const px = a.x + (b.x - a.x) * t;
                const py = a.y + (b.y - a.y) * t;
                if (ctx.cb.getDistance(tower.x, tower.y, px, py) <= effectiveRange) {
                  validPoints.push({ x: px, y: py });
                }
              }
            }
          });

          if (validPoints.length > 0) {
            const chosen = validPoints[Math.floor(getPureRandom() * validPoints.length)];
            const bestX = chosen.x + (getPureRandom() - 0.5) * 10;
            const bestY = chosen.y + (getPureRandom() - 0.5) * 10;
            // Throw a mine projectile; it becomes a placed mine on landing
            refs.mineProjectilesRef.current.push({
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
        const effectiveRange = ctx.cb.getEffectiveTowerRange(tower);
        const effectiveDamage = ctx.cb.getEffectiveTowerDamage(tower);
        const tackCount = tower.tackCount || 6;
        const projCap = ARRAY_CAPS.PROJECTILES * (refs.settingsRef.current.effectLimits ? 1 : 2);
        for (let ti = 0; ti < tackCount; ti++) {
          const angle = (Math.PI * 2 * ti) / tackCount + refs.frameCountRef.current * 0.01;
          pushWithCap(refs.projectilesRef.current, {
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
          }, projCap);
        }
      }
      return;
    }

    // Boomerang: curved projectile that hits on the way out and back.
    if (tower.type === "boomerang") {
      const projCap = ARRAY_CAPS.PROJECTILES * (refs.settingsRef.current.effectLimits ? 1 : 2);
      const particleCap = ARRAY_CAPS.PARTICLES * (refs.settingsRef.current.effectLimits ? 1 : 2);
      if (tower.cooldown <= 0 && refs.enemiesRef.current.length > 0) {
        const targetsInRange = refs.enemiesRef.current.filter((e) => {
          if (e.isCamo && !isCamoCapable) return false;
          if (e.isPhantomCamo && !tower.camoDetection && !tower.hasCamoBuff) return false;
          if (e.isFlying && !ANTI_AIR_TOWERS.has(tower.type)) return false;
          return ctx.cb.getDistance(tower.x, tower.y, e.x, e.y) <= ctx.cb.getEffectiveTowerRange(tower);
        });

        if (targetsInRange.length > 0) {
          targetsInRange.sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;
            if (tower.prioritizeCamo && isCamoCapable) {
              if (a.isCamo || a.isPhantomCamo) scoreA += 10;
              if (b.isCamo || b.isPhantomCamo) scoreB += 10;
            }
            if (tower.prioritizeDrones && ANTI_AIR_TOWERS.has(tower.type)) {
              if (a.isFlying) scoreA += 10;
              if (b.isFlying) scoreB += 10;
            }
            if (scoreA !== scoreB) {
              return scoreB - scoreA;
            }
            const mode = tower.targetingMode || "first";
            if (mode === "first") {
              return b.distanceTraveled - a.distanceTraveled;
            } else if (mode === "last") {
              return a.distanceTraveled - b.distanceTraveled;
            } else if (mode === "strongest") {
              return b.hp - a.hp;
            } else if (mode === "nearest") {
              return ctx.cb.getDistance(tower.x, tower.y, a.x, a.y) - ctx.cb.getDistance(tower.x, tower.y, b.x, b.y);
            }
            return 0;
          });
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
            damage: ctx.cb.getEffectiveTowerDamage(tower),
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
            maxDistance: ctx.cb.getEffectiveTowerRange(tower),
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
                  x: tower.x + Math.cos(angle - Math.PI / 2) * 8,
                  y: tower.y + Math.sin(angle - Math.PI / 2) * 8
                };
                const rightProj = {
                  ...newProj,
                  id: projId + "_R",
                  angle: angle + 0.25,
                  spinRotation: angle + 0.25,
                  x: tower.x + Math.cos(angle + Math.PI / 2) * 8,
                  y: tower.y + Math.sin(angle + Math.PI / 2) * 8
                };
                pushWithCap(refs.projectilesRef.current, [leftProj, rightProj], projCap);
              } else {
                // Fire 1 additional projectile (right) to make it 2 total
                const rightProj = {
                  ...newProj,
                  id: projId + "_2",
                  angle: angle + 0.25,
                  spinRotation: angle + 0.25,
                  x: tower.x + Math.cos(angle + Math.PI / 2) * 8,
                  y: tower.y + Math.sin(angle + Math.PI / 2) * 8
                };
                pushWithCap(refs.projectilesRef.current, rightProj, projCap);
              }
            }
          }

          pushWithCap(refs.projectilesRef.current, newProj, projCap);

          // Muzzle flash particles
          for (let mi = 0; mi < 5; mi++) {
            pushWithCap(refs.particlesRef.current, {
              x: tower.x,
              y: tower.y,
              vx: Math.cos(angle + (Math.random() - 0.5) * 0.8) * (Math.random() * 3 + 2),
              vy: Math.sin(angle + (Math.random() - 0.5) * 0.8) * (Math.random() * 3 + 2),
              color: tower.color,
              size: Math.random() * 3 + 1,
              life: 8,
              maxLife: 8
            }, particleCap);
          }
        }
      }
      return;
    }

    // Target selection for projectile towers (Hammer, Candy, Infinix)
    if (tower.cooldown <= 0 && refs.enemiesRef.current.length > 0) {
      // Find enemies in range
      const targetsInRange = refs.enemiesRef.current.filter((e) => {
        if (e.isCamo && !isCamoCapable) return false;
        // Phantom camo requires higher level detection
        if (e.isPhantomCamo && !tower.camoDetection && !tower.hasCamoBuff) return false;
        if (e.isFlying && !ANTI_AIR_TOWERS.has(tower.type)) return false;
        return ctx.cb.getDistance(tower.x, tower.y, e.x, e.y) <= ctx.cb.getEffectiveTowerRange(tower);
      });

      if (targetsInRange.length > 0) {
        // Apply targeting mode and priorities
        targetsInRange.sort((a, b) => {
          let scoreA = 0;
          let scoreB = 0;
          if (tower.prioritizeCamo && isCamoCapable) {
            if (a.isCamo || a.isPhantomCamo) scoreA += 10;
            if (b.isCamo || b.isPhantomCamo) scoreB += 10;
          }
          if (tower.prioritizeDrones && ANTI_AIR_TOWERS.has(tower.type)) {
            if (a.isFlying) scoreA += 10;
            if (b.isFlying) scoreB += 10;
          }
          if (scoreA !== scoreB) {
            return scoreB - scoreA;
          }
          const mode = tower.targetingMode || "first";
          if (mode === "first") {
            return b.distanceTraveled - a.distanceTraveled;
          } else if (mode === "last") {
            return a.distanceTraveled - b.distanceTraveled;
          } else if (mode === "strongest") {
            return b.hp - a.hp;
          } else if (mode === "nearest") {
            return ctx.cb.getDistance(tower.x, tower.y, a.x, a.y) - ctx.cb.getDistance(tower.x, tower.y, b.x, b.y);
          }
          return 0;
        });
        const target = targetsInRange[0];

        // Fire!
        tower.cooldown = tower.fireRate * 60; // reset frame cooldown

        // Projectile details
        const projId = getPureId();
        const dx = target.x - tower.x;
        const dy = target.y - tower.y;
        let angle = Math.atan2(dy, dx);
        if (tower.type === "flamethrower") {
          angle += (getPureRandom() - 0.5) * 0.08;
        }

        const newProj: Projectile = {
          id: projId,
          type: tower.type,
          x: tower.x,
          y: tower.y,
          targetId: target.id,
          speed: tower.type === "infinix" ? 14 : 7, // Infinix beam is very fast
          damage: ctx.cb.getEffectiveTowerDamage(tower),
          emoji: tower.emoji,
          color: tower.color,
          towerId: tower.id,
          fireDoTDamage: tower.fireDoTDamage,
          fireDoTDuration: tower.fireDoTDuration,
          fireDoTMaxStacks: tower.fireDoTMaxStacks,
          antiRegenFactor: tower.antiRegenFactor,
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
        const projCap = ARRAY_CAPS.PROJECTILES * (refs.settingsRef.current.effectLimits ? 1 : 2);
        const particleCap = ARRAY_CAPS.PARTICLES * (refs.settingsRef.current.effectLimits ? 1 : 2);

        if (tower.quadShot) {
          const angles = [angle - 0.3, angle - 0.1, angle + 0.1, angle + 0.3];
          angles.forEach((a, idx) => {
            pushWithCap(refs.projectilesRef.current, {
              ...newProj,
              id: `${projId}_quad_${idx}`,
              angle: a,
              spinRotation: a,
              x: tower.x + Math.cos(a + Math.PI / 2) * 4,
              y: tower.y + Math.sin(a + Math.PI / 2) * 4
            }, projCap);
          });
        } else if (tower.tripleShot || (tower.everyNthTriple && (shotCount + 1) % tower.everyNthTriple === 0)) {
          const angles = [angle - 0.25, angle, angle + 0.25];
          angles.forEach((a, idx) => {
            pushWithCap(refs.projectilesRef.current, {
              ...newProj,
              id: `${projId}_triple_${idx}`,
              angle: a,
              spinRotation: a,
              x: tower.x + Math.cos(a + Math.PI / 2) * 4,
              y: tower.y + Math.sin(a + Math.PI / 2) * 4
            }, projCap);
          });
        } else if (tower.alwaysDouble || (tower.twoHits && (shotCount + 1) % 3 === 0)) {
          const offsetProj = {
            ...newProj,
            id: projId + "_2",
            angle: angle + 0.25,
            spinRotation: angle + 0.25,
            x: tower.x + Math.cos(angle + Math.PI / 2) * 8,
            y: tower.y + Math.sin(angle + Math.PI / 2) * 8
          };
          pushWithCap(refs.projectilesRef.current, [offsetProj, newProj], projCap);
        } else {
          pushWithCap(refs.projectilesRef.current, newProj, projCap);
        }

        // Muzzle flash particles
        for (let mi = 0; mi < 5; mi++) {
          pushWithCap(refs.particlesRef.current, {
            x: tower.x,
            y: tower.y,
            vx: Math.cos(angle + (Math.random() - 0.5) * 0.8) * (Math.random() * 3 + 2),
            vy: Math.sin(angle + (Math.random() - 0.5) * 0.8) * (Math.random() * 3 + 2),
            color: tower.color,
            size: Math.random() * 3 + 1,
            life: 8,
            maxLife: 8
          }, particleCap);
        }
      }
    }
  });
}

/** Update thrown mine projectiles (mid-air) and convert them to placed mines on landing. */
function processMineProjectiles(ctx: EngineContext): void {
  const refs = ctx.refs;
  for (let i = refs.mineProjectilesRef.current.length - 1; i >= 0; i--) {
    const mp = refs.mineProjectilesRef.current[i];
    mp.progress += mp.speed;
    mp.x = mp.startX + (mp.targetX - mp.startX) * mp.progress;
    mp.y = mp.startY + (mp.targetY - mp.startY) * mp.progress;

    if (mp.progress >= 1) {
      const sourceTower = refs.towersRef.current.find(t => t.id === mp.towerId);
      if (sourceTower) {
        const mineDamage = ctx.cb.getEffectiveTowerDamage(sourceTower);
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
        refs.minesRef.current.push(mine);
      }
      refs.mineProjectilesRef.current.splice(i, 1);
    }
  }
}

/** Section 5: projectile flight, collision, damage, status effects. */
function processProjectiles(ctx: EngineContext): void {
  const refs = ctx.refs;
  for (let i = refs.projectilesRef.current.length - 1; i >= 0; i--) {
    const proj = refs.projectilesRef.current[i];
    let snappedToTarget = false;
    let snapDistance = 0;

    // Homing: adjust angle toward target each frame
    if (proj.targetId) {
      const targetEnemy = refs.enemiesRef.current.find(e => e.id === proj.targetId && e.hp > 0);
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
    refs.projectileTrailRef.current.push({
      x: proj.x,
      y: proj.y,
      color: proj.color,
      alpha: 0.6,
      size: 4
    });
    // Limit trail length
    if (refs.projectileTrailRef.current.length > 200) {
      refs.projectileTrailRef.current = refs.projectileTrailRef.current.slice(-200);
    }

    // Boomerang: turn around at target/max range and fly back to the tower in an arc.
    if (proj.type === "boomerang") {
      const originDx = (proj.originX ?? proj.x) - proj.x;
      const originDy = (proj.originY ?? proj.y) - proj.y;
      const distToOrigin = Math.hypot(originDx, originDy);

      if (proj.isReturning) {
        const directAngle = Math.atan2(originDy, originDx);
        if (distToOrigin <= 40) {
          proj.angle = directAngle;
        } else {
          let diff = directAngle - proj.angle;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          proj.angle += diff * 0.08;
        }
        if (distToOrigin <= proj.speed + 2) {
          refs.projectilesRef.current.splice(i, 1);
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
          proj.angle = Math.atan2(originDy, originDx) + 0.8;
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
      refs.projectilesRef.current.splice(i, 1);
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
    for (let eIdx = refs.enemiesRef.current.length - 1; eIdx >= 0; eIdx--) {
      const enemy = refs.enemiesRef.current[eIdx];
      if (enemy.hp <= 0) continue;
      if (enemy.isCamo && !proj.camoDetection) continue;
      if (enemy.isFlying && !ANTI_AIR_TOWERS.has(proj.type)) continue;

      // Check collision distance
      const colDist = ctx.cb.getDistance(proj.x, proj.y, enemy.x, enemy.y);
      const hitRadius = proj.type === "gas" ? 14 : 8;
      if (colDist <= enemy.radius + hitRadius && !proj.hitEnemyIds.includes(enemy.id)) {
        // Hit!
        proj.hitEnemyIds.push(enemy.id);
        proj.pierce--;

        if (proj.fireDoTDamage && proj.fireDoTDuration) {
          if (!enemy.fireDoTStacks) {
            enemy.fireDoTStacks = [];
          }
          enemy.fireDoTStacks.push({
            damage: proj.fireDoTDamage,
            duration: proj.fireDoTDuration,
            maxDuration: proj.fireDoTDuration,
            antiRegenFactor: proj.antiRegenFactor || 0
          });
          const maxStacks = proj.fireDoTMaxStacks || 3;
          if (enemy.fireDoTStacks.length > maxStacks) {
            enemy.fireDoTStacks.shift();
          }
        }

        let dmg = proj.type === "chain" ? Math.max(1, Math.floor(proj.damage)) : proj.damage;

        // Chain deals reduced damage to flying enemies
        if (proj.type === "chain" && enemy.isFlying) {
          dmg = Math.max(1, Math.floor(dmg * 0.75));
        }

        // Shield absorption
        if (enemy.shieldHp !== undefined && enemy.shieldHp > 0) {
          const absorbed = Math.min(enemy.shieldHp, dmg);
          enemy.shieldHp -= absorbed;
          dmg -= absorbed;
          if (absorbed > 0) {
            ctx.cb.spawnFloatingText(enemy.x, enemy.y - 10, `🛡️ -${absorbed}`, "#0ea5e9");
          }
        }

        // Infinix random damage
        if (proj.type === "infinix") {
          dmg = Math.max(5, Math.floor(proj.damage * (0.5 + getPureRandom())));
        }

        if (proj.type === "gas" && proj.antiArmor && (enemy.isArmored || enemy.isSuperArmored) && dmg > 0) {
          dmg = Math.floor(dmg * 1.5);
        }

        // Lead armor immunity (hammer, gas/tack shooter, and chain/electra)
        if (enemy.isLead && (proj.type === "hammer" || proj.type === "gas" || proj.type === "chain") && !proj.ignoresArmor) {
          dmg = 0;
          ctx.cb.spawnFloatingText(enemy.x, enemy.y - 15, "IMMUNE 🔩", "#94a3b8");
          ctx.cb.spawnHitParticles(enemy.x, enemy.y, "#9ca3af", 5);
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
          ctx.cb.emitSound(SoundEvent.CRIT_HIT);
        }

        // Check Gacha jackpot
        if (dmg > 0 && proj.gachaChance && getPureRandom() < proj.gachaChance) {
          if (proj.gachaDamageMultiplier) {
            dmg = Math.floor(proj.damage * proj.gachaDamageMultiplier);
          } else {
            dmg = proj.gachaDamageOverride || 300;
          }
          isCrit = true;
          ctx.cb.emitSound(SoundEvent.CRIT_HIT);
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
        if (dmg > 0) ctx.cb.addTowerXpById(proj.towerId, dmg * 0.02);
        enemy.lastHitFrame = refs.frameCountRef.current;

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
          ctx.cb.spawnFloatingText(enemy.x + (Math.random() - 0.5) * 10, enemy.y - 10 - (isCrit ? 12 : 0), `-${dmg}`, color, size);
        }

        // Apply status effects
        if (proj.type === "candy") {
          enemy.slowDuration = Math.max(enemy.slowDuration, 120 + (proj.slowDurationBonus || 0));
          enemy.candySlowFactor = Math.max(enemy.candySlowFactor || 0, Math.min(0.85, 0.5 + (proj.slowFactorBonus || 0)));

          if (proj.damageDebuff) {
            enemy.damageDebuff = ctx.cb.applyDamageDebuffCap(enemy.damageDebuff, proj.damageDebuff);
          }

          if (proj.microStunDuration && !enemy.stunImmune && !(enemy.freezeDuration > 0)) {
            enemy.freezeDuration = proj.microStunDuration;
            ctx.cb.spawnFloatingText(enemy.x, enemy.y - 15, "⏱️ СТАН", "#f472b6");
          }

          // Candy P3T5 spread logic
          if (proj.spreadChance && getPureRandom() < proj.spreadChance) {
            const neighbors = refs.enemiesRef.current.filter((other) =>
              other.id !== enemy.id &&
              other.hp > 0 &&
              (!other.isCamo || proj.camoDetection) &&
              (!other.isPhantomCamo || proj.camoDetection) &&
              ctx.cb.getDistance(enemy.x, enemy.y, other.x, other.y) <= 60 &&
              !proj.hitEnemyIds.includes(other.id)
            );
            if (neighbors.length > 0) {
              const neighbor = neighbors[Math.floor(getPureRandom() * neighbors.length)];
              proj.hitEnemyIds.push(neighbor.id);

              neighbor.slowDuration = Math.max(neighbor.slowDuration, 120 + (proj.slowDurationBonus || 0));
              neighbor.candySlowFactor = Math.max(neighbor.candySlowFactor || 0, Math.min(0.85, 0.5 + (proj.slowFactorBonus || 0)));

              if (proj.microStunDuration && !neighbor.stunImmune && !(neighbor.freezeDuration > 0)) {
                neighbor.freezeDuration = proj.microStunDuration;
                ctx.cb.spawnFloatingText(neighbor.x, neighbor.y - 15, "⏱️ СТАН", "#f472b6");
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
              if (splashDmg > 0) ctx.cb.addTowerXpById(proj.towerId, splashDmg * 0.02);
              if (splashDmg > 0) {
                ctx.cb.spawnFloatingText(neighbor.x, neighbor.y - 10, `-${splashDmg}`, "#f472b6", 11);
              }

              ctx.cb.spawnHitParticles(neighbor.x, neighbor.y, "#f472b6", 6);
              const particleCount = 5;
              const spreadCap = ARRAY_CAPS.PARTICLES * (refs.settingsRef.current.effectLimits ? 1 : 2);
              for (let pi = 0; pi <= particleCount; pi++) {
                const t = pi / particleCount;
                pushWithCap(refs.particlesRef.current, {
                  x: enemy.x + (neighbor.x - enemy.x) * t,
                  y: enemy.y + (neighbor.y - enemy.y) * t,
                  vx: (Math.random() - 0.5) * 0.5,
                  vy: (Math.random() - 0.5) * 0.5,
                  color: "#f472b6",
                  size: 2,
                  life: 15,
                  maxLife: 15
                }, spreadCap);
              }
            }
          }

          if (proj.isAoESlow) {
            const candyRadius = proj.explodeDmg && proj.explodeDmg >= 80 ? 150 : proj.explodeDmg ? 100 : 60;
            // slow nearby enemies and apply promised explosion damage
            refs.enemiesRef.current.forEach((other) => {
              if (ctx.cb.getDistance(enemy.x, enemy.y, other.x, other.y) <= candyRadius) {
                other.slowDuration = Math.max(other.slowDuration, 90 + (proj.slowDurationBonus || 0));
                other.candySlowFactor = Math.max(other.candySlowFactor || 0, Math.min(0.85, 0.5 + (proj.slowFactorBonus || 0)));
                if (proj.damageDebuff) {
                  other.damageDebuff = ctx.cb.applyDamageDebuffCap(other.damageDebuff, proj.damageDebuff);
                }
                if (proj.explodeDmg && other.id !== enemy.id) {
                  let splashDmg = proj.explodeDmg;
                  if (other.isLead || other.isCeramic) {
                    splashDmg = Math.floor(splashDmg * 1.5);
                  }
                  if (other.shieldHp !== undefined && other.shieldHp > 0) {
                    const absorbed = Math.min(other.shieldHp, splashDmg);
                    other.shieldHp -= absorbed;
                    splashDmg -= absorbed;
                  }
                  if (other.damageDebuff && splashDmg > 0) splashDmg = Math.floor(splashDmg * other.damageDebuff);
                  if (other.damageReduce && splashDmg > 0) splashDmg = Math.floor(splashDmg * (1 - other.damageReduce));
                  other.hp -= splashDmg;
                  if (splashDmg > 0) ctx.cb.addTowerXpById(proj.towerId, splashDmg * 0.02);
                }
              }
            });
            ctx.cb.spawnHitParticles(enemy.x, enemy.y, "#f97316", 12);
          }
        }

        if (proj.type === "gas") {
          enemy.gasSlowDuration = Math.max(enemy.gasSlowDuration, 45);
          enemy.gasSlowFactor = Math.max(enemy.gasSlowFactor || 0, proj.slowAmount || 0.15);
          if (proj.damageDebuff) {
            enemy.damageDebuff = ctx.cb.applyDamageDebuffCap(enemy.damageDebuff, proj.damageDebuff);
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
            ctx.cb.spawnFloatingText(enemy.x, enemy.y - 15, "ЛАГ 999мс", "#c084fc");
            if (proj.bsodAoE) {
              refs.enemiesRef.current.forEach((other) => {
                if (other.id !== enemy.id && ctx.cb.getDistance(enemy.x, enemy.y, other.x, other.y) <= 80) {
                  other.gasSlowDuration = Math.max(other.gasSlowDuration, 60);
                  other.gasSlowFactor = Math.max(other.gasSlowFactor || 0, 0.35);
                }
              });
            }
          }

          if (proj.copilotBug) {
            enemy.hasCopilotBug = true;
            enemy.bugExplodeDmg = proj.bugExplodeDmg || 75;
            enemy.bugExplodeRadius = proj.bugExplodeRadius || 80;
            enemy.bugContagion = proj.bugContagion || false;
          }
        }

        if (proj.type === "chain" || proj.type === "monolith" || proj.type === "boomerang") {
          if (proj.freezeChance && getPureRandom() < proj.freezeChance && !enemy.stunImmune && !(enemy.freezeDuration > 0)) {
            enemy.freezeDuration = 30 + (proj.freezeDurationBonus || 0);
            ctx.cb.spawnFloatingText(enemy.x, enemy.y - 15, "⚡ СТАН", "#38bdf8");
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
          const kbDist = (proj.knockbackDistance || 50) * (enemy.knockbackMultiplier || 1);
          enemy.distanceTraveled = Math.max(0, enemy.distanceTraveled - kbDist);
          const route = ctx.cb.getEnemyRoute(enemy);
          const position = ctx.cb.getRouteDistancePosition(route.points, enemy.distanceTraveled);
          enemy.x = position.x;
          enemy.y = position.y;
          enemy.pathIndex = position.pathIndex;

          ctx.cb.spawnFloatingText(enemy.x, enemy.y - 15, "💥 ВІДКИД", "#c084fc");
          ctx.cb.spawnHitParticles(enemy.x, enemy.y, "#d8b4fe", 8, "square");
        }

        if ((proj.type === "sniper" || proj.type === "monolith") && proj.explodeDmg) {
          const explosionRadius = proj.explodeDmg >= 200 ? 120 : 50;
          refs.enemiesRef.current.forEach((other) => {
            if (other.id === enemy.id || other.hp <= 0) return;
            if (ctx.cb.getDistance(enemy.x, enemy.y, other.x, other.y) > explosionRadius) return;
            let splashDmg = proj.explodeDmg || 0;
            if (other.isLead || other.isCeramic) {
              splashDmg = Math.floor(splashDmg * 1.5);
            }
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
            if (splashDmg > 0) ctx.cb.addTowerXpById(proj.towerId, splashDmg * 0.02);
          });
          ctx.cb.spawnHitParticles(enemy.x, enemy.y, "#f43f5e", 14, "square");
        }

        // Floating texts
        if (isCrit) {
          ctx.cb.spawnFloatingText(enemy.x, enemy.y - 25, "ПОЧУВ! CRIT", "#f43f5e");
        }

        // Check kill
        if (wasAlive && enemy.hp <= 0) {
          const sourceTower = refs.towersRef.current
            .filter((t) => t.type === proj.type && ctx.cb.getDistance(t.x, t.y, enemy.x, enemy.y) <= ctx.cb.getEffectiveTowerRange(t) + 40)
            .sort((a, b) => ctx.cb.getDistance(a.x, a.y, enemy.x, enemy.y) - ctx.cb.getDistance(b.x, b.y, enemy.x, enemy.y))[0];

          if (sourceTower) {
            sourceTower.totalKills++;
          }
        }

        // Trigger particles
        ctx.cb.spawnHitParticles(enemy.x, enemy.y, proj.color, 6);

        if (proj.type === "chain" && proj.pierce > 0) {
          proj.damage = Math.max(1, proj.damage * 0.8);
        }

        // Check if projectile is depleted
        if (proj.pierce <= 0) {
          refs.projectilesRef.current.splice(i, 1);
          hasSpliced = true;
          break;
        } else {
          // Clear targetId for non-chain projectiles so they don't lock onto the hit enemy
          if (proj.type !== "chain") {
            proj.targetId = "";
          }

          // Boomerang: after moving away from the turnaround point, reset hit list so it can strike the same enemies again on the way back.
          if (proj.type === "boomerang" && proj.isReturning && !proj.returnHitReset) {
            const turnDx = proj.x - (proj.turnX ?? proj.x);
            const turnDy = proj.y - (proj.turnY ?? proj.y);
            if (Math.hypot(turnDx, turnDy) > 25) {
              proj.hitEnemyIds = [];
              proj.returnHitReset = true;
            }
          }

          // Homing Ricochet to next target (only for chain)
          if (proj.type === "chain") {
            const nextTarget = refs.enemiesRef.current
              .filter((other) => other.hp > 0 && !proj.hitEnemyIds.includes(other.id) && ctx.cb.getDistance(proj.x, proj.y, other.x, other.y) <= 120 && !(other.isCamo && !proj.camoDetection))
              .sort((a, b) => ctx.cb.getDistance(proj.x, proj.y, a.x, a.y) - ctx.cb.getDistance(proj.x, proj.y, b.x, b.y))[0];

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
}

/** Section 6: dead-enemy cleanup (gold, score, onDeath spawn, bug explosion, screen shake). */
function processDeadEnemies(ctx: EngineContext): void {
  const refs = ctx.refs;
  const frame = refs.frameCountRef.current;
  for (let i = refs.enemiesRef.current.length - 1; i >= 0; i--) {
    const enemy = refs.enemiesRef.current[i];
    if (enemy.isDying) {
      if (frame - (enemy.deathFrame ?? 0) >= 10) {
        refs.enemiesRef.current.splice(i, 1);
      }
    } else if (enemy.hp <= 0) {
      handleEnemyDeath(ctx, enemy, i);
    }
  }
}

function handleEnemyDeath(ctx: EngineContext, enemy: ActiveEnemy, index: number): void {
  const refs = ctx.refs;
  refs.waveKillsRef.current++;
  if (enemy.type === "boss") ctx.cb.addPlayerXp(100);
  if (enemy.type === "megaboss") ctx.cb.addPlayerXp(300);
  // Reward gold
  ctx.cb.setGold((prev) => prev + enemy.reward);
  ctx.cb.setScore((prev) => prev + 1);
  ctx.cb.spawnFloatingText(enemy.x, enemy.y, `+${enemy.reward} ☕`, "#eab308");

  // Check Copilot Bug explosion
  if (enemy.hasCopilotBug) {
    const explodeDmg = enemy.bugExplodeDmg || 75;
    const explodeRad = enemy.bugExplodeRadius || 80;
    ctx.cb.spawnFloatingText(enemy.x, enemy.y - 15, "BUG EXPLOSION!", "#a855f7");
    ctx.cb.spawnHitParticles(enemy.x, enemy.y, "#a855f7", 15, "square");

    // Damage nearby enemies
    refs.enemiesRef.current.forEach((other) => {
      if (other.id !== enemy.id && other.hp > 0 && ctx.cb.getDistance(enemy.x, enemy.y, other.x, other.y) <= explodeRad) {
        const wasAliveOther = other.hp > 0;
        let dmg = explodeDmg;
        if (other.isLead || other.isCeramic) {
          dmg = Math.floor(dmg * 1.5);
        }
        other.hp -= dmg;
        // If other dies from explosion, attribute kill to nearest Infinix tower
        if (wasAliveOther && other.hp <= 0) {
          const sourceTower = refs.towersRef.current
            .filter((t) => t.type === "infinix" && ctx.cb.getDistance(t.x, t.y, other.x, other.y) <= t.range + 40)
            .sort((a, b) => ctx.cb.getDistance(a.x, a.y, other.x, other.y) - ctx.cb.getDistance(b.x, b.y, other.x, other.y))[0];
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
    enemy.onDeath(enemy.x, enemy.y, (type, rx, ry, modifiers) => ctx.cb.spawnEnemyCallback(type, rx, ry, modifiers, enemy.routeId));
  }

  // Exploder stun
  if (enemy.isExploder) {
    refs.towersRef.current.forEach((t) => {
      if (ctx.cb.getDistance(enemy.x, enemy.y, t.x, t.y) <= 80) {
        t.stunDuration = 90; // 1.5 seconds at 60fps
      }
    });
    ctx.cb.spawnFloatingText(enemy.x, enemy.y - 20, "💥 ОГЛУШЕННЯ!", "#f97316");
    ctx.cb.spawnHitParticles(enemy.x, enemy.y, "#f97316", 20, "square");
  }

  // Kamikaze: 15 dmg + 0.5s stun to towers within 60px
  if (enemy.type === "kamikaze") {
    refs.towersRef.current.forEach((t) => {
      if (ctx.cb.getDistance(enemy.x, enemy.y, t.x, t.y) <= 60) {
        t.damageTaken = (t.damageTaken || 0) + 15;
        t.stunDuration = 30;
      }
    });
    ctx.cb.spawnFloatingText(enemy.x, enemy.y - 20, "💥 ВИБУХ!", "#fde047");
    ctx.cb.spawnHitParticles(enemy.x, enemy.y, "#fde047", 18, "square");
  }

  // Screen shake on boss kill
  if (enemy.type === "boss" || enemy.type === "megaboss") {
    if (refs.settingsRef.current.screenShake) refs.screenShakeRef.current = { x: 0, y: 0, intensity: enemy.type === "megaboss" ? 12 : 8, duration: 20 };
  }

  // Explosion ring on death
  const isBoss = enemy.type === "boss" || enemy.type === "megaboss";
  const deathMaxRadius = isBoss ? 90 : 40;
  const deathLife = isBoss ? 35 : 20;
  const deathColor = enemy.borderColor || "#ef4444";
  const deathRingCap = ARRAY_CAPS.EXPLOSION_RINGS * (refs.settingsRef.current.effectLimits ? 1 : 2);
  pushWithCap(refs.explosionRingsRef.current, {
    x: enemy.x, y: enemy.y,
    radius: 5, maxRadius: deathMaxRadius,
    color: deathColor,
    life: deathLife, coreLife: deathLife, ringCount: isBoss ? 3 : 2,
    debris: Array.from({ length: isBoss ? 16 : 8 }, () => ({
      x: enemy.x, y: enemy.y,
      vx: (Math.random() - 0.5) * (isBoss ? 5 : 3),
      vy: (Math.random() - 0.5) * (isBoss ? 5 : 3),
      size: Math.random() * 3 + 1,
      life: isBoss ? 30 : 18, maxLife: isBoss ? 30 : 18,
      color: deathColor
    }))
  }, deathRingCap);

  // Mark for death fade-out (renderer draws fading sprite for 10 frames)
  enemy.isDying = true;
  enemy.deathFrame = refs.frameCountRef.current;
}

// ─────────────────────────────────────────────────────────────────────────
//  Main entry point — called every animation frame by the React layer.
//  Pure extraction: identical control flow to the original `updateGame`.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Per-frame state mutator. Mutates `ctx.refs` in place and emits pending
 * events to `ctx.refs.pendingEventsRef` for the React layer to drain
 * (achievement toasts, victory gameover, wave-cleared notifications).
 *
 * Speed multiplier (`gameSpeedRef`) is honored: each call runs the
 * simulation `speedMult` times.
 */
export function updateGame(ctx: EngineContext): void {
  const refs = ctx.refs;
  refs.frameCountRef.current++;
  // If not playing or paused, skip physics updates
  if (refs.gameStatusRef.current !== "playing" || refs.isPausedRef.current) return;

  const speedMult = refs.gameSpeedRef.current; // 1 or 2

  for (let s = 0; s < speedMult; s++) {
    // --- 1. SPAWNING ENEMIES ---
    processSpawningAndWaveClear(ctx);

    // --- 2. MOVE TRAILS & PARTICLES & FLOATS ---
    tickCosmeticSystems(ctx);

    // --- 3. PROCESS ENEMIES ---
    processEnemies(ctx);

    // --- 4. TOWERS TARGET & FIRE ---
    processTowers(ctx);

    // --- Update thrown mine projectiles ---
    processMineProjectiles(ctx);

    // --- 5. PROCESS PROJECTILES ---
    processProjectiles(ctx);

    // --- 6. UNIFIED DEAD ENEMIES CLEANUP ---
    processDeadEnemies(ctx);
  }

  spawnCosmeticParticles(ctx);
}

export {
  DIFFICULTY_CONFIG,
  SCENE_THEMES,
  MAP_DECOR,
  UPGRADE_STAT_KEYS,
  applyDifficultyToEnemy,
  applyUpgradeStats,
  buildUpgradeStats,
  calculateTowerBuffs,
  checkUpgradeAllowed,
  formatSeconds,
  formatStat,
  getEffectiveTowerDamage,
  getEffectiveTowerRange,
  getExpectedDps,
  getNonEndlessWaveClearReward,
  getUpgradePreview,
  isSupportTowerType,
} from "./pure";
