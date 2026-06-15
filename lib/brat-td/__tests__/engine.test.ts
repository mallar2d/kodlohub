import { describe, it, expect, vi } from 'vitest';
import { updateGame } from '../engine';
import type { EngineContext, EngineRefs } from '../engine';
import type { ActiveEnemy, Projectile } from '../types';
import { SpatialGrid } from '../spatial-grid';

describe('Brat TD Engine: Shotgunning Protection', () => {
  it('prevents multiple gas projectiles from the same tower from hitting an enemy in the same frame burst', () => {
    // Mock callbacks
    const mockCallbacks = {
      getDistance: vi.fn((x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1)),
      getEffectiveTowerDamage: vi.fn((t) => t.damage),
      getEffectiveTowerRange: vi.fn((t) => t.range),
      emitSound: vi.fn(),
      spawnHitParticles: vi.fn(),
      spawnFloatingText: vi.fn(),
      addTowerXpById: vi.fn(),
      applyDamageDebuffCap: vi.fn((c, i) => Math.min(1.6, Math.max(c || 1, i))),
      getEnemyRoute: vi.fn(() => ({ points: [{ x: 100, y: 100 }, { x: 500, y: 100 }] })),
      setLives: vi.fn(),
    };

    // Create a mock enemy
    const enemy: ActiveEnemy = {
      id: 'enemy_1',
      type: 'ordinary',
      x: 100,
      y: 100,
      hp: 100,
      maxHp: 100,
      speed: 1,
      reward: 2,
      damage: 5,
      color: '#ffffff',
      borderColor: '#000000',
      radius: 14,
      name: 'Test Enemy',
      emoji: '😐',
      routeId: '1',
      pathIndex: 0,
      distanceTraveled: 0,
      slowDuration: 0,
      freezeDuration: 0,
      gasSlowDuration: 0,
      lastGasHitFrameByTower: {},
    };

    // Create two projectiles from the same gas tower, hitting on the same frame
    const proj1: Projectile = {
      id: 'proj_1',
      type: 'gas',
      x: 100,
      y: 100, // exact overlap with enemy
      targetId: '',
      speed: 6,
      damage: 10,
      emoji: '💨',
      color: '#22c55e',
      towerId: 'gas_tower_1',
      hitEnemyIds: [],
      pierce: 1,
      angle: 0,
      lastTargetX: 200,
      lastTargetY: 100,
      travelDistance: 0,
      maxDistance: 100,
    };

    const proj2: Projectile = {
      id: 'proj_2',
      type: 'gas',
      x: 100,
      y: 100, // exact overlap with enemy
      targetId: '',
      speed: 6,
      damage: 10,
      emoji: '💨',
      color: '#22c55e',
      towerId: 'gas_tower_1',
      hitEnemyIds: [],
      pierce: 1,
      angle: Math.PI,
      lastTargetX: 0,
      lastTargetY: 100,
      travelDistance: 0,
      maxDistance: 100,
    };

    // Construct minimum refs needed by updateGame / processProjectiles
    const refs: Partial<EngineRefs> = {
      frameCountRef: { current: 100 },
      enemiesRef: { current: [enemy] },
      projectilesRef: { current: [proj1, proj2] },
      particlesRef: { current: [] },
      floatingTextsRef: { current: [] },
      speedTrailsRef: { current: [] },
      minesRef: { current: [] },
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
      selectedMapIdRef: { current: 'map_1' },
      enemyGridRef: { current: new SpatialGrid<ActiveEnemy>() },
      pendingEventsRef: { current: [] },
      mineProjectilesRef: { current: [] },
      towersRef: { current: [] },
    };

    const ctx: EngineContext = {
      refs: refs as EngineRefs,
      cb: mockCallbacks as any,
    };

    // Run one update tick
    updateGame(ctx);

    // Enemy should have been hit only once (hp should be 90, not 80)
    expect(enemy.hp).toBe(90);
  });
});
