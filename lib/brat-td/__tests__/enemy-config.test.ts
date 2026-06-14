/**
 * Tests for ENEMY_CONFIGS — validates enemy definitions, boss spawn lists, and
 * field invariants. Pure logic only, no Canvas, no React.
 */
import { describe, it, expect } from 'vitest';
import { ENEMY_CONFIGS } from '@/app/(main)/tools/brat-td/gameConfig';

const ALL_ENEMY_TYPES = Object.keys(ENEMY_CONFIGS);

const BOSS_ENEMY_TYPES = ['matryoshka', 'big_matryoshka', 'ceramic', 'boss', 'megaboss'];

describe('ENEMY_CONFIGS: structure', () => {
  it('contains a positive number of enemy types', () => {
    expect(ALL_ENEMY_TYPES.length).toBeGreaterThanOrEqual(20);
  });

  it.each(ALL_ENEMY_TYPES)(
    '%s has all required fields (hp, speed, name, reward, damage, radius, color)',
    (type) => {
      const enemy = ENEMY_CONFIGS[type];
      expect(enemy.name).toBeTypeOf('string');
      expect(enemy.name.length).toBeGreaterThan(0);
      expect(enemy.hp).toBeTypeOf('number');
      expect(enemy.speed).toBeTypeOf('number');
      expect(enemy.reward).toBeTypeOf('number');
      expect(enemy.damage).toBeTypeOf('number');
      expect(enemy.radius).toBeTypeOf('number');
      expect(enemy.color).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      expect(enemy.borderColor).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      expect(enemy.description).toBeTypeOf('string');
    },
  );
});

describe('ENEMY_CONFIGS: numeric invariants', () => {
  it.each(ALL_ENEMY_TYPES)('%s has positive HP', (type) => {
    const enemy = ENEMY_CONFIGS[type];
    expect(enemy.hp).toBeGreaterThan(0);
  });

  it.each(ALL_ENEMY_TYPES)('%s has positive speed', (type) => {
    const enemy = ENEMY_CONFIGS[type];
    expect(enemy.speed).toBeGreaterThan(0);
  });

  it.each(ALL_ENEMY_TYPES)('%s has positive reward', (type) => {
    const enemy = ENEMY_CONFIGS[type];
    expect(enemy.reward).toBeGreaterThanOrEqual(0);
  });

  it.each(ALL_ENEMY_TYPES)('%s has positive damage value', (type) => {
    const enemy = ENEMY_CONFIGS[type];
    expect(enemy.damage).toBeGreaterThan(0);
  });

  it.each(ALL_ENEMY_TYPES)('%s has positive radius', (type) => {
    const enemy = ENEMY_CONFIGS[type];
    expect(enemy.radius).toBeGreaterThan(0);
  });

  it('boss enemies have higher HP than ordinary enemies', () => {
    const ordinaryHp = ENEMY_CONFIGS.ordinary.hp;
    for (const bossType of ['boss', 'megaboss']) {
      expect(ENEMY_CONFIGS[bossType].hp).toBeGreaterThan(ordinaryHp * 10);
    }
  });
});

describe('ENEMY_CONFIGS: spawn lists (onDeath)', () => {
  /**
   * The plan calls these "boss enemies" with spawn lists. We execute each
   * onDeath against a stub spawn callback and verify every child type is
   * a known enemy.
   */
  function collectSpawnedTypes(
    onDeath: NonNullable<typeof ENEMY_CONFIGS.ordinary.onDeath>,
  ): string[] {
    const spawned: string[] = [];
    const spawnCallback = (type: string) => {
      spawned.push(type);
    };
    // Provide a callback signature compatible with onDeath.
    onDeath(0, 0, spawnCallback as any);
    return spawned;
  }

  it.each(BOSS_ENEMY_TYPES.filter((t) => ENEMY_CONFIGS[t].onDeath))(
    '%s onDeath references valid enemy types',
    (type) => {
      const enemy = ENEMY_CONFIGS[type];
      if (!enemy.onDeath) throw new Error('expected onDeath to be defined');
      const spawned = collectSpawnedTypes(enemy.onDeath);
      expect(spawned.length).toBeGreaterThan(0);
      for (const childType of spawned) {
        expect(ENEMY_CONFIGS[childType]).toBeDefined();
      }
    },
  );

  it('matryoshka onDeath spawns exactly 2 enemies', () => {
    const spawned: string[] = [];
    const cb = (type: string) => spawned.push(type);
    ENEMY_CONFIGS.matryoshka.onDeath!(0, 0, cb as any);
    expect(spawned).toHaveLength(2);
    for (const t of spawned) expect(t).toBe('coat');
  });

  it('big_matryoshka onDeath spawns exactly 3 enemies', () => {
    const spawned: string[] = [];
    const cb = (type: string) => spawned.push(type);
    ENEMY_CONFIGS.big_matryoshka.onDeath!(0, 0, cb as any);
    expect(spawned).toHaveLength(3);
    for (const t of spawned) expect(t).toBe('matryoshka');
  });

  it('boss onDeath spawns 10 enemies total (5 matryoshka + 5 fast)', () => {
    const spawned: string[] = [];
    const cb = (type: string) => spawned.push(type);
    ENEMY_CONFIGS.boss.onDeath!(0, 0, cb as any);
    expect(spawned).toHaveLength(10);
    const matryoshkaCount = spawned.filter((s) => s === 'matryoshka').length;
    const fastCount = spawned.filter((s) => s === 'fast').length;
    expect(matryoshkaCount).toBe(5);
    expect(fastCount).toBe(5);
  });

  it('megaboss onDeath spawns 6 enemies (3 boss + 3 big_matryoshka)', () => {
    const spawned: string[] = [];
    const cb = (type: string) => spawned.push(type);
    ENEMY_CONFIGS.megaboss.onDeath!(0, 0, cb as any);
    expect(spawned).toHaveLength(6);
    const bossCount = spawned.filter((s) => s === 'boss').length;
    const bigMatryoshkaCount = spawned.filter((s) => s === 'big_matryoshka').length;
    expect(bossCount).toBe(3);
    expect(bigMatryoshkaCount).toBe(3);
  });
});

describe('ENEMY_CONFIGS: ability flags', () => {
  it('flying enemies include drone_brat, drone_brat_armored, and drone_scout', () => {
    const flyingTypes = ALL_ENEMY_TYPES.filter(
      (t) => ENEMY_CONFIGS[t].isFlying,
    );
    expect(flyingTypes).toContain('drone_brat');
    expect(flyingTypes).toContain('drone_brat_armored');
    expect(flyingTypes).toContain('drone_scout');
  });

  it('drone_scout has correct base stats (HP=25, Speed=1.8, Flying+Camo)', () => {
    const scout = ENEMY_CONFIGS.drone_scout;
    expect(scout).toBeDefined();
    expect(scout.hp).toBe(25);
    expect(scout.speed).toBe(1.8);
    expect(scout.isFlying).toBe(true);
    expect(scout.isCamo).toBe(true);
    expect(scout.reward).toBe(4);
    expect(scout.damage).toBe(8);
    expect(scout.radius).toBe(11);
    expect(scout.name).toBe('Брат-Дрон-Розвідник');
    // Should NOT have armor, lead, or regen flags
    expect(scout.isArmored).toBeUndefined();
    expect(scout.isLead).toBeUndefined();
    expect(scout.isRegen).toBeUndefined();
  });

  it('granite is super armored', () => {
    expect(ENEMY_CONFIGS.granite.isSuperArmored).toBe(true);
  });

  it('ceramic spawns a mix of fast and regen enemies', () => {
    const spawned: string[] = [];
    const cb = (type: string) => spawned.push(type);
    ENEMY_CONFIGS.ceramic.onDeath!(0, 0, cb as any);
    expect(spawned.length).toBe(5); // 3 fast + 2 ordinary
    const fastCount = spawned.filter((s) => s === 'fast').length;
    const ordinaryCount = spawned.filter((s) => s === 'ordinary').length;
    expect(fastCount).toBe(3);
    expect(ordinaryCount).toBe(2);
  });
});

describe('ENEMY_CONFIGS: kamikaze', () => {
  it('kamikaze has HP=30 and Speed=2.5 as specified', () => {
    expect(ENEMY_CONFIGS.kamikaze).toBeDefined();
    expect(ENEMY_CONFIGS.kamikaze.hp).toBe(30);
    expect(ENEMY_CONFIGS.kamikaze.speed).toBe(2.5);
  });

  it('kamikaze is faster than ordinary and faster than fast', () => {
    expect(ENEMY_CONFIGS.kamikaze.speed).toBeGreaterThan(ENEMY_CONFIGS.ordinary.speed);
    expect(ENEMY_CONFIGS.kamikaze.speed).toBeGreaterThan(ENEMY_CONFIGS.fast.speed);
  });

  it('kamikaze is not armored, not camo, not lead, not regen at base', () => {
    const k = ENEMY_CONFIGS.kamikaze;
    expect(k.isArmored).toBeFalsy();
    expect(k.isSuperArmored).toBeFalsy();
    expect(k.isCamo).toBeFalsy();
    expect(k.isLead).toBeFalsy();
    expect(k.isRegen).toBeFalsy();
    expect(k.isPhantomCamo).toBeFalsy();
  });

  it('kamikaze has no onDeath spawn callback (death effect handled in engine)', () => {
    expect(ENEMY_CONFIGS.kamikaze.onDeath).toBeUndefined();
  });
});
