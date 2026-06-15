/**
 * Bug fix tests for Phase 1.4.
 *
 * Targets: dying enemy processing, double DoT damage, effect stack cleanup,
 * shield regeneration on dead enemies.
 */
import { describe, it, expect, vi } from 'vitest';
import { updateGame } from '../engine';
import type { EngineContext, EngineRefs } from '../engine';
import type { ActiveEnemy, Projectile, FireDoTStack } from '../types';
import { SpatialGrid } from '../spatial-grid';

function makeMockCallbacks(overrides: Partial<any> = {}) {
  return {
    getDistance: vi.fn((x1: number, y1: number, x2: number, y2: number) =>
      Math.hypot(x2 - x1, y2 - y1)
    ),
    getEffectiveTowerDamage: vi.fn((t: any) => t.damage),
    getEffectiveTowerRange: vi.fn((t: any) => t.range),
    emitSound: vi.fn(),
    spawnHitParticles: vi.fn(),
    spawnFloatingText: vi.fn(),
    addTowerXpById: vi.fn(),
    addTowerXp: vi.fn(),
    addPlayerXp: vi.fn(),
    applyDamageDebuffCap: vi.fn((c: number | undefined, i: number) =>
      Math.min(1.6, Math.max(c || 1, i))
    ),
    getEnemyRoute: vi.fn(() => ({
      points: [
        { x: 0, y: 100 },
        { x: 800, y: 100 },
      ],
    })),
    getActiveMap: vi.fn(() => ({
      routes: [{ id: 'main', points: [{ x: 0, y: 100 }, { x: 800, y: 100 }] }],
    })),
    getRouteById: vi.fn(() => ({
      id: 'main',
      points: [{ x: 0, y: 100 }, { x: 800, y: 100 }],
    })),
    getWaveRouteIds: vi.fn(() => ['main']),
    getRouteDistancePosition: vi.fn((_pts: any, dist: number) => ({
      x: dist,
      y: 100,
      pathIndex: 0,
    })),
    getNonEndlessWaveClearReward: vi.fn(() => 150),
    applyDifficultyToEnemy: vi.fn(<T>(enemy: T) => enemy),
    isSupportTowerType: vi.fn(() => false),
    isEndless: false,
    isSandbox: false,
    setLives: vi.fn(),
    setGold: vi.fn(),
    setScore: vi.fn(),
    setWave: vi.fn(),
    setIsWaveActive: vi.fn(),
    setGameStatus: vi.fn(),
    pushLog: vi.fn(),
    spawnEnemyCallback: vi.fn(),
    startNextWave: vi.fn(),
    buildSessionSummary: vi.fn(),
    awardAchievements: vi.fn(),
    markCurrentMapCompleted: vi.fn(),
    ...overrides,
  };
}

// ---- Bug 1: Dying enemies should not be processed ----

describe('Bug fix: dying enemies skip processing', () => {
  it('enemy with isDying=true should not take DoT damage or move', () => {
    const enemy: ActiveEnemy = {
      id: 'enemy_1',
      type: 'ordinary',
      x: 100, y: 100,
      hp: 0,
      maxHp: 100,
      speed: 1,
      reward: 5,
      damage: 5,
      color: '#fff',
      borderColor: '#000',
      radius: 10,
      name: 'Test',
      emoji: 'T',
      routeId: 'main',
      pathIndex: 0,
      distanceTraveled: 0,
      slowDuration: 0,
      freezeDuration: 0,
      gasSlowDuration: 0,
      isDying: true,
      deathFrame: 100, // same as current frame — stays for 10-frame fade-out
      fireDoTStacks: [
        { damage: 50, duration: 120, maxDuration: 120, tickTimer: 60, antiRegenFactor: 0 },
      ],
    };

    const refs: Partial<EngineRefs> = {
      frameCountRef: { current: 100 },
      enemiesRef: { current: [enemy] },
      projectilesRef: { current: [] },
      particlesRef: { current: [] },
      floatingTextsRef: { current: [] },
      speedTrailsRef: { current: [] },
      minesRef: { current: [] },
      mineProjectilesRef: { current: [] },
      livesRef: { current: 100 },
      goldRef: { current: 100 },
      waveRef: { current: 1 },
      isWaveActiveRef: { current: true },
      gameStatusRef: { current: 'playing' },
      isPausedRef: { current: false },
      gameSpeedRef: { current: 1 },
      isAutoStartRef: { current: false },
      scoreRef: { current: 0 },
      screenShakeRef: { current: { x: 0, y: 0, intensity: 0, duration: 0 } },
      projectileTrailRef: { current: [] },
      explosionRingsRef: { current: [] },
      waveAnnouncementRef: { current: null },
      spawnQueueRef: { current: [] },
      spawnTimerRef: { current: 0 },
      waveTotalEnemiesRef: { current: 0 },
      waveTotalHpRef: { current: 0 },
      waveStartLivesRef: { current: 100 },
      waveKillsRef: { current: 0 },
      sessionSeedRef: { current: 12345 },
      progressionRef: { current: { activeEffect: null } as any },
      settingsRef: { current: { particles: true, effectLimits: false, screenShake: false } },
      difficultyRef: { current: 'normal' },
      selectedMapIdRef: { current: 'yard' },
      enemyGridRef: { current: new SpatialGrid<ActiveEnemy>() },
      pendingEventsRef: { current: [] },
      towersRef: { current: [] },
    };

    const ctx: EngineContext = {
      refs: refs as EngineRefs,
      cb: makeMockCallbacks() as any,
    };

    updateGame(ctx);

    // Enemy should still be in array (not removed — 10-frame fade-out active)
    expect(refs.enemiesRef.current.length).toBe(1);
    // DoT stack should NOT have been processed (duration unchanged)
    expect(enemy.fireDoTStacks?.[0].duration).toBe(120);
  });
});

// ---- Bug 2: Shield not regenerating on dead enemies ----

describe('Bug fix: shield does not regenerate on dead/dying enemies', () => {
  it('enemy with hp <= 0 should not regenerate shield', () => {
    const enemy: ActiveEnemy = {
      id: 'enemy_2',
      type: 'shielded',
      x: 100, y: 100,
      hp: 0,
      maxHp: 80,
      speed: 1,
      reward: 10,
      damage: 10,
      color: '#fff',
      borderColor: '#888',
      radius: 14,
      name: 'Shielded',
      emoji: 'S',
      routeId: 'main',
      pathIndex: 0,
      distanceTraveled: 0,
      slowDuration: 0,
      freezeDuration: 0,
      gasSlowDuration: 0,
      shieldHp: 0,
      maxShieldHp: 40,
      shieldRegenTimer: 0, // would regen immediately if not skipped
    };

    const refs: Partial<EngineRefs> = {
      frameCountRef: { current: 100 },
      enemiesRef: { current: [enemy] },
      projectilesRef: { current: [] },
      particlesRef: { current: [] },
      floatingTextsRef: { current: [] },
      speedTrailsRef: { current: [] },
      minesRef: { current: [] },
      mineProjectilesRef: { current: [] },
      livesRef: { current: 100 },
      goldRef: { current: 100 },
      waveRef: { current: 1 },
      isWaveActiveRef: { current: true },
      gameStatusRef: { current: 'playing' },
      isPausedRef: { current: false },
      gameSpeedRef: { current: 1 },
      isAutoStartRef: { current: false },
      scoreRef: { current: 0 },
      screenShakeRef: { current: { x: 0, y: 0, intensity: 0, duration: 0 } },
      projectileTrailRef: { current: [] },
      explosionRingsRef: { current: [] },
      waveAnnouncementRef: { current: null },
      spawnQueueRef: { current: [] },
      spawnTimerRef: { current: 0 },
      waveTotalEnemiesRef: { current: 0 },
      waveTotalHpRef: { current: 0 },
      waveStartLivesRef: { current: 100 },
      waveKillsRef: { current: 0 },
      sessionSeedRef: { current: 12345 },
      progressionRef: { current: { activeEffect: null } as any },
      settingsRef: { current: { particles: true, effectLimits: false, screenShake: false } },
      difficultyRef: { current: 'normal' },
      selectedMapIdRef: { current: 'yard' },
      enemyGridRef: { current: new SpatialGrid<ActiveEnemy>() },
      pendingEventsRef: { current: [] },
      towersRef: { current: [] },
    };

    const ctx: EngineContext = {
      refs: refs as EngineRefs,
      cb: makeMockCallbacks() as any,
    };

    updateGame(ctx);

    // Shield should be cleared on death (our fix prevents regen on dead enemies)
    expect(enemy.shieldHp).toBeUndefined();
    // Enemy should be marked as dying
    expect(enemy.isDying).toBe(true);
  });
});

// ---- Bug 3: Fire DoT stacks not cleaned up on death ----

describe('Bug fix: Fire DoT stacks cleanup on enemy death', () => {
  it('freshly killed enemy does not continue ticking DoT', () => {
    const enemy: ActiveEnemy = {
      id: 'enemy_3',
      type: 'ordinary',
      x: 100, y: 100,
      hp: 15,
      maxHp: 100,
      speed: 1,
      reward: 5,
      damage: 5,
      color: '#fff',
      borderColor: '#000',
      radius: 10,
      name: 'Test',
      emoji: 'T',
      routeId: 'main',
      pathIndex: 0,
      distanceTraveled: 0,
      slowDuration: 0,
      freezeDuration: 0,
      gasSlowDuration: 0,
      fireDoTStacks: [
        { damage: 20, duration: 60, maxDuration: 60, tickTimer: 30, antiRegenFactor: 0 },
      ],
    };

    // A projectile that will kill the enemy
    const proj: Projectile = {
      id: 'proj_1',
      type: 'hammer',
      x: 100, y: 100,
      targetId: '',
      speed: 7,
      damage: 20,
      emoji: '🔨',
      color: '#38bdf8',
      pierce: 1,
      hitEnemyIds: [],
      angle: 0,
      lastTargetX: 200,
      lastTargetY: 100,
      travelDistance: 0,
      maxDistance: 200,
    };

    const refs: Partial<EngineRefs> = {
      frameCountRef: { current: 100 },
      enemiesRef: { current: [enemy] },
      projectilesRef: { current: [proj] },
      particlesRef: { current: [] },
      floatingTextsRef: { current: [] },
      speedTrailsRef: { current: [] },
      minesRef: { current: [] },
      mineProjectilesRef: { current: [] },
      livesRef: { current: 100 },
      goldRef: { current: 100 },
      waveRef: { current: 1 },
      isWaveActiveRef: { current: true },
      gameStatusRef: { current: 'playing' },
      isPausedRef: { current: false },
      gameSpeedRef: { current: 1 },
      isAutoStartRef: { current: false },
      scoreRef: { current: 0 },
      screenShakeRef: { current: { x: 0, y: 0, intensity: 0, duration: 0 } },
      projectileTrailRef: { current: [] },
      explosionRingsRef: { current: [] },
      waveAnnouncementRef: { current: null },
      spawnQueueRef: { current: [] },
      spawnTimerRef: { current: 0 },
      waveTotalEnemiesRef: { current: 0 },
      waveTotalHpRef: { current: 0 },
      waveStartLivesRef: { current: 100 },
      waveKillsRef: { current: 0 },
      sessionSeedRef: { current: 12345 },
      progressionRef: { current: { activeEffect: null } as any },
      settingsRef: { current: { particles: true, effectLimits: false, screenShake: false } },
      difficultyRef: { current: 'normal' },
      selectedMapIdRef: { current: 'yard' },
      enemyGridRef: { current: new SpatialGrid<ActiveEnemy>() },
      pendingEventsRef: { current: [] },
      towersRef: { current: [] },
    };

    const ctx: EngineContext = {
      refs: refs as EngineRefs,
      cb: makeMockCallbacks() as any,
    };

    updateGame(ctx);

    // Enemy should be dying (hp went to -5, then handleEnemyDeath ran)
    expect(enemy.isDying).toBe(true);
    // Fire DoT stacks should be cleared on death
    expect(enemy.fireDoTStacks).toBeUndefined();
  });
});
