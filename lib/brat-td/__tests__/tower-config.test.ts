/**
 * Tests for TOWER_CONFIGS — validates tower definitions, upgrade paths, and
 * crosspathing invariants. Pure logic only, no Canvas, no React.
 */
import { describe, it, expect } from 'vitest';
import {
  TOWER_CONFIGS,
  ANTI_AIR_TOWERS,
  SUPPORT_TOWERS,
} from '@/app/(main)/tools/brat-td/gameConfig';

const EXPECTED_TOWER_TYPES = [
  'hammer',
  'coffee',
  'candy',
  'infinix',
  'gas',
  'sniper',
  'chain',
  'kladmen',
  'bankomat',
  'monolith',
  'boomerang',
  'flamethrower',
];

describe('TOWER_CONFIGS: structure', () => {
  it('contains exactly 12 tower types', () => {
    expect(Object.keys(TOWER_CONFIGS)).toHaveLength(12);
  });

  it('includes all expected tower types', () => {
    for (const towerType of EXPECTED_TOWER_TYPES) {
      expect(TOWER_CONFIGS[towerType]).toBeDefined();
    }
  });

  it.each(EXPECTED_TOWER_TYPES)(
    '%s has valid base stats (cost, range, fire rate, damage, name)',
    (towerType) => {
      const tower = TOWER_CONFIGS[towerType];
      expect(tower.name).toBeTypeOf('string');
      expect(tower.name.length).toBeGreaterThan(0);
      expect(tower.cost).toBeTypeOf('number');
      expect(tower.cost).toBeGreaterThan(0);
      expect(tower.range).toBeTypeOf('number');
      expect(tower.range).toBeGreaterThan(0);
      expect(tower.damage).toBeTypeOf('number');
      expect(tower.damage).toBeGreaterThanOrEqual(0);
      expect(tower.fireRate).toBeTypeOf('number');
      expect(tower.fireRate).toBeGreaterThanOrEqual(0);
      expect(tower.color).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      expect(tower.emoji).toBeTypeOf('string');
      expect(tower.upgrades).toBeDefined();
    },
  );
});

describe('TOWER_CONFIGS: upgrade paths', () => {
  it.each(EXPECTED_TOWER_TYPES)(
    '%s has exactly 3 upgrade paths (path1, path2, path3)',
    (towerType) => {
      const tower = TOWER_CONFIGS[towerType];
      expect(tower.upgrades.path1).toBeDefined();
      expect(tower.upgrades.path2).toBeDefined();
      expect(tower.upgrades.path3).toBeDefined();
    },
  );

  it.each(EXPECTED_TOWER_TYPES)(
    '%s has exactly 5 tiers per upgrade path',
    (towerType) => {
      const tower = TOWER_CONFIGS[towerType];
      expect(tower.upgrades.path1).toHaveLength(5);
      expect(tower.upgrades.path2).toHaveLength(5);
      expect(tower.upgrades.path3).toHaveLength(5);
    },
  );

  it.each(EXPECTED_TOWER_TYPES)(
    '%s upgrade tiers have increasing cost (BTD6 rule)',
    (towerType) => {
      const tower = TOWER_CONFIGS[towerType];
      for (const pathKey of ['path1', 'path2', 'path3'] as const) {
        const path = tower.upgrades[pathKey];
        for (let i = 1; i < path.length; i++) {
          expect(path[i].cost).toBeGreaterThan(path[i - 1].cost);
        }
      }
    },
  );

  it.each(EXPECTED_TOWER_TYPES)(
    '%s each upgrade has a unique id, name, cost, and effect function',
    (towerType) => {
      const tower = TOWER_CONFIGS[towerType];
      const allIds = new Set<string>();
      for (const pathKey of ['path1', 'path2', 'path3'] as const) {
        for (const upgrade of tower.upgrades[pathKey]) {
          expect(upgrade.id).toBeTypeOf('string');
          expect(upgrade.id.length).toBeGreaterThan(0);
          expect(allIds.has(upgrade.id)).toBe(false);
          allIds.add(upgrade.id);
          expect(upgrade.name).toBeTypeOf('string');
          expect(upgrade.cost).toBeTypeOf('number');
          expect(upgrade.cost).toBeGreaterThan(0);
          expect(upgrade.effect).toBeTypeOf('function');
        }
      }
    },
  );
});

describe('TOWER_CONFIGS: upgrade effect functions', () => {
  it('each upgrade effect returns a valid UpgradeStats object', () => {
    const baseStats = {
      range: 100,
      damage: 50,
      fireRate: 1.0,
    };
    for (const towerType of EXPECTED_TOWER_TYPES) {
      const tower = TOWER_CONFIGS[towerType];
      for (const pathKey of ['path1', 'path2', 'path3'] as const) {
        for (const upgrade of tower.upgrades[pathKey]) {
          const result = upgrade.effect({ ...baseStats });
          expect(result).toBeDefined();
          expect(result.range).toBeTypeOf('number');
          expect(result.damage).toBeTypeOf('number');
          expect(result.fireRate).toBeTypeOf('number');
        }
      }
    }
  });
});

describe('TOWER_CONFIGS: tower categorization', () => {
  it('ANTI_AIR_TOWERS set contains exactly 5 entries', () => {
    expect(ANTI_AIR_TOWERS.size).toBe(5);
  });

  it('ANTI_AIR_TOWERS contains candy, infinix, sniper, chain, monolith', () => {
    expect(ANTI_AIR_TOWERS.has('candy')).toBe(true);
    expect(ANTI_AIR_TOWERS.has('infinix')).toBe(true);
    expect(ANTI_AIR_TOWERS.has('sniper')).toBe(true);
    expect(ANTI_AIR_TOWERS.has('chain')).toBe(true);
    expect(ANTI_AIR_TOWERS.has('monolith')).toBe(true);
  });

  it('ANTI_AIR_TOWERS contains only valid tower types', () => {
    for (const towerType of ANTI_AIR_TOWERS) {
      expect(TOWER_CONFIGS[towerType]).toBeDefined();
    }
  });

  it('SUPPORT_TOWERS contains coffee and bankomat', () => {
    expect(SUPPORT_TOWERS.size).toBe(2);
    expect(SUPPORT_TOWERS.has('coffee')).toBe(true);
    expect(SUPPORT_TOWERS.has('bankomat')).toBe(true);
  });

  it('SUPPORT_TOWERS contains only towers with damage 0 (pure support)', () => {
    for (const towerType of SUPPORT_TOWERS) {
      const tower = TOWER_CONFIGS[towerType];
      expect(tower.damage).toBe(0);
      expect(tower.fireRate).toBe(0);
    }
  });

  it('hammer, boomerang, gas, kladmen are not in ANTI_AIR_TOWERS or SUPPORT_TOWERS', () => {
    const unclassified = ['hammer', 'boomerang', 'gas', 'kladmen'];
    for (const t of unclassified) {
      expect(ANTI_AIR_TOWERS.has(t)).toBe(false);
      expect(SUPPORT_TOWERS.has(t)).toBe(false);
    }
  });
});

describe('TOWER_CONFIGS: BTD6 crosspathing rules', () => {
  /**
   * BTD6 crosspathing invariant: max 2 paths can have tier >= 2 active at any
   * time. The natural cap encoded by the game is 5 tiers per path with T5
   * being exclusive (only one path may have T5). Test that tier structure
   * itself is compatible with these rules.
   */
  it.each(EXPECTED_TOWER_TYPES)(
    '%s tier-5 upgrade exists and is more expensive than tier-4',
    (towerType) => {
      const tower = TOWER_CONFIGS[towerType];
      for (const pathKey of ['path1', 'path2', 'path3'] as const) {
        const t5 = tower.upgrades[pathKey][4];
        const t4 = tower.upgrades[pathKey][3];
        expect(t5.cost).toBeGreaterThan(t4.cost);
      }
    },
  );

  it('tier-5 upgrade costs are 10x or more than tier-1 (BTD6 rule of thumb)', () => {
    for (const towerType of EXPECTED_TOWER_TYPES) {
      const tower = TOWER_CONFIGS[towerType];
      for (const pathKey of ['path1', 'path2', 'path3'] as const) {
        const t1 = tower.upgrades[pathKey][0];
        const t5 = tower.upgrades[pathKey][4];
        // BTD6 rule: T5 is at least ~10x more expensive than T1.
        expect(t5.cost).toBeGreaterThanOrEqual(t1.cost * 10);
      }
    }
  });
});

describe('TOWER_CONFIGS: flamethrower (DoT anti-regen specialist)', () => {
  const flame = TOWER_CONFIGS.flamethrower;

  it('has expected base stats (cost 500, range 120, fire rate 0.25, damage 2)', () => {
    expect(flame).toBeDefined();
    expect(flame.name).toBe('Вогнемет Подро');
    expect(flame.emoji).toBe('🔥');
    expect(flame.cost).toBe(500);
    expect(flame.range).toBe(120);
    expect(flame.fireRate).toBe(0.25);
    expect(flame.damage).toBe(2);
  });

  it('has Fire DoT base values: 8 damage over 4s, max 3 stacks', () => {
    // 4 seconds at 60fps = 240 frames
    expect(flame.fireDoTDamage).toBe(8);
    expect(flame.fireDoTDuration).toBe(240);
    expect(flame.fireDoTMaxStacks).toBe(3);
  });

  it('is GROUND-ONLY (not in ANTI_AIR_TOWERS or SUPPORT_TOWERS)', () => {
    expect(ANTI_AIR_TOWERS.has('flamethrower')).toBe(false);
    expect(SUPPORT_TOWERS.has('flamethrower')).toBe(false);
  });

  it('has 3 paths × 5 tiers (15 upgrades total)', () => {
    expect(flame.upgrades.path1).toHaveLength(5);
    expect(flame.upgrades.path2).toHaveLength(5);
    expect(flame.upgrades.path3).toHaveLength(5);
  });

  it('path1 upgrade effects increase DoT damage cumulatively (fireDoTDamage only grows)', () => {
    const baseStats = { range: 100, damage: 50, fireRate: 1.0 };
    let prevDoT = (flame.fireDoTDamage as number) ?? 0;
    for (const upgrade of flame.upgrades.path1) {
      const result = upgrade.effect({ ...baseStats });
      const newDoT = (result.fireDoTDamage as number) ?? prevDoT;
      expect(newDoT).toBeGreaterThanOrEqual(prevDoT);
      prevDoT = newDoT;
    }
  });

  it('path3 (DoT focus) increases fireDoTMaxStacks at tier 5 (T5 unlocks 5 stacks)', () => {
    const baseStats = { range: 100, damage: 50, fireRate: 1.0 };
    const t5 = flame.upgrades.path3[4];
    const result = t5.effect({ ...baseStats });
    expect(result.fireDoTMaxStacks).toBe(5);
  });

  it('DoT stacks cap at 3 by default (cannot exceed 3 without T5 upgrade)', () => {
    expect(flame.fireDoTMaxStacks).toBe(3);
  });
});
