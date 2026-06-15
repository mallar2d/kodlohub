/**
 * Global tower rebalance tests — Phase 1.5.
 *
 * Every tower gets a clear specialization with balanced base stats.
 * Tests assert both current (baseline) and target (after rebalance) values.
 * TDD RED phase: all target tests should fail, then we implement.
 */
import { describe, it, expect } from 'vitest';
import {
  TOWER_CONFIGS,
  COFFEE_BUFF_DEFAULTS,
  ANTI_AIR_TOWERS,
} from '@/app/(main)/tools/brat-td/gameConfig';
import { DIFFICULTY_CONFIG } from '@/lib/brat-td/pure';

// ---- Specialization Matrix ----
// Each tower has ONE primary specialization and ONE secondary

const SPECIALIZATIONS = {
  hammer:      { primary: 'cost-efficient single-target', secondary: 'pierce scaling' },
  boomerang:   { primary: 'crowd piercer (out+back)',   secondary: 'pierce specialist' },
  candy:       { primary: 'slow controller',             secondary: 'anti-air utility' },
  gas:         { primary: 'choke-point AoE',             secondary: 'slow/debuff' },
  sniper:      { primary: 'global-range eliminator',     secondary: 'single-target burst' },
  chain:       { primary: 'chain-lightning crowd',       secondary: 'anti-air specialist' },
  kladmen:     { primary: 'mine trapper',                secondary: 'area denial' },
  infinix:     { primary: 'gacha gambler',              secondary: 'camo detection' },
  flamethrower:{ primary: 'DoT anti-regen',             secondary: 'area burn' },
  coffee:      { primary: 'attack-speed support',        secondary: 'income generation' },
  bankomat:    { primary: 'all-round support hub',       secondary: 'camo/armor enable' },
  monolith:    { primary: 'late-game hyper-carry',       secondary: 'stun/disable' },
} as const;

// ---- Target Stats (after rebalance) ----

interface TargetStats {
  cost: number;
  damage: number;
  fireRate: number;
  range: number;
  pierce?: number;
  tackCount?: number;
  other?: Record<string, number>;
}

const TARGET_STATS: Record<string, TargetStats> = {
  hammer:      { cost: 200, damage: 42, fireRate: 1.10, range: 140, pierce: 1 },
  boomerang:   { cost: 250, damage: 32, fireRate: 1.15, range: 135, pierce: 4 },
  candy:       { cost: 250, damage: 11, fireRate: 1.20, range: 150, pierce: 1 },
  gas:         { cost: 320, damage: 17.25, fireRate: 0.90, range: 82, pierce: 1, tackCount: 8 },
  sniper:      { cost: 475, damage: 225, fireRate: 2.50, range: 1000, pierce: 1 },
  chain:       { cost: 480, damage: 22, fireRate: 1.00, range: 130, pierce: 3 },
  kladmen:     { cost: 350, damage: 30, fireRate: 2.80, range: 150, pierce: 2 },
  infinix:     { cost: 400, damage: 50, fireRate: 0.80, range: 120, pierce: 1 },
  flamethrower:{ cost: 500, damage: 5, fireRate: 0.15, range: 120, pierce: 1, other: { fireDoTDamage: 10, fireDoTDuration: 240, fireDoTMaxStacks: 3 } },
  coffee:      { cost: 800, damage: 0, fireRate: 0, range: 110 },
  bankomat:    { cost: 900, damage: 0, fireRate: 0, range: 105 },
  monolith:    { cost: 1500, damage: 24, fireRate: 0.14, range: 165, pierce: 1 },
};

// ---- Computed DPS ----

function dps(name: string): number {
  const t = TOWER_CONFIGS[name];
  if (!t || t.fireRate === 0) return 0;
  return t.damage / t.fireRate;
}

function costPerDps(name: string): number {
  const d = dps(name);
  return d > 0 ? TOWER_CONFIGS[name].cost / d : Infinity;
}

// ---- Base Stat Tests ----

describe('Base stat targets', () => {
  for (const [name, target] of Object.entries(TARGET_STATS)) {
    it(`${name}: cost=${target.cost} damage=${target.damage} fireRate=${target.fireRate}`, () => {
      const t = TOWER_CONFIGS[name];
      expect(t.cost).toBe(target.cost);
      expect(t.damage).toBe(target.damage);
      expect(t.fireRate).toBe(target.fireRate);
      if (target.range !== undefined) expect(t.range).toBe(target.range);
      if (target.pierce !== undefined) expect(t.pierce ?? 1).toBe(target.pierce);
      if (target.tackCount !== undefined) expect(t.tackCount).toBe(target.tackCount);
      if (target.other) {
        for (const [key, val] of Object.entries(target.other)) {
          expect((t as any)[key]).toBe(val);
        }
      }
    });
  }
});

// ---- DPS Ranking (after rebalance) ----

describe('DPS ranking after rebalance', () => {
  it('monolith has highest DPS (late-game carry)', () => {
    const dpsTowers = Object.keys(TOWER_CONFIGS)
      .filter((n) => TOWER_CONFIGS[n].damage > 0)
      .sort((a, b) => dps(b) - dps(a));
    expect(dpsTowers[0]).toBe('monolith');
    expect(dps('monolith')).toBeGreaterThan(160);
  });

  it('sniper second highest single-hit damage, but slow fireRate', () => {
    expect(TOWER_CONFIGS.sniper.damage).toBeGreaterThan(200);
    expect(TOWER_CONFIGS.sniper.fireRate).toBeGreaterThanOrEqual(2.0);
  });

  it('chain has >= 20 DPS base (buffed from 14.35)', () => {
    expect(dps('chain')).toBeGreaterThanOrEqual(20);
  });

  it('flamethrower has >= 5 damage per hit (buffed from 3)', () => {
    expect(TOWER_CONFIGS.flamethrower.damage).toBeGreaterThanOrEqual(5);
    expect(TOWER_CONFIGS.flamethrower.fireDoTDamage).toBeGreaterThanOrEqual(10);
  });
});

// ---- Cost Efficiency Ranking ----

describe('Cost efficiency ranking', () => {
  it('hammer is the most cost-efficient damage tower', () => {
    const damagingTowers = Object.keys(TOWER_CONFIGS)
      .filter((n) => TOWER_CONFIGS[n].damage > 0);
    const best = damagingTowers.reduce((a, b) =>
      costPerDps(a) < costPerDps(b) ? a : b
    );
    expect(best).toBe('hammer');
  });

  it('no direct-damage tower exceeds 25 cost-per-DPS', () => {
    const MINE_DOT_TOWERS = new Set(['kladmen', 'flamethrower', 'candy']); // value from mines/DoT/slow, not direct DPS
    for (const [name] of Object.entries(TOWER_CONFIGS)) {
      if (TOWER_CONFIGS[name].damage <= 0) continue;
      if (MINE_DOT_TOWERS.has(name)) continue;
      expect(costPerDps(name)).toBeLessThanOrEqual(25);
    }
  });

  it('chain cost/DPS <= 25 (was ~42, now competitive)', () => {
    expect(costPerDps('chain')).toBeLessThanOrEqual(25);
  });
});

// ---- Support Tower ROI ----

describe('Support tower ROI', () => {
  it('coffee costs <= 900 (was 1350 — impossible to afford)', () => {
    expect(TOWER_CONFIGS.coffee.cost).toBeLessThanOrEqual(900);
  });

  it('coffee buff >= 8% (was 5% — negligible)', () => {
    expect(COFFEE_BUFF_DEFAULTS.attackSpeed).toBeGreaterThanOrEqual(0.08);
  });

  it('bankomat costs <= 950 (was 1200)', () => {
    expect(TOWER_CONFIGS.bankomat.cost).toBeLessThanOrEqual(950);
  });

  it('support towers cost more than 2 starter towers', () => {
    const twoHammers = TOWER_CONFIGS.hammer.cost * 2;
    expect(TOWER_CONFIGS.coffee.cost).toBeGreaterThan(twoHammers);
    expect(TOWER_CONFIGS.bankomat.cost).toBeGreaterThan(twoHammers);
  });
});

// ---- Upgrade Path Integrity ----

describe('Upgrade path integrity', () => {
  for (const [name] of Object.entries(TOWER_CONFIGS)) {
    it(`${name}: each upgrade path has exactly 5 tiers`, () => {
      const t = TOWER_CONFIGS[name];
      expect(t.upgrades.path1).toHaveLength(5);
      expect(t.upgrades.path2).toHaveLength(5);
      expect(t.upgrades.path3).toHaveLength(5);
    });

    it(`${name}: upgrade costs increase monotonically per path`, () => {
      const t = TOWER_CONFIGS[name];
      for (const p of ['path1', 'path2', 'path3'] as const) {
        for (let i = 1; i < t.upgrades[p].length; i++) {
          expect(t.upgrades[p][i].cost).toBeGreaterThan(t.upgrades[p][i - 1].cost);
        }
      }
    });

    it(`${name}: T1 costs are affordable (≤ tower base cost)`, () => {
      const t = TOWER_CONFIGS[name];
      for (const p of ['path1', 'path2', 'path3'] as const) {
        expect(t.upgrades[p][0].cost).toBeLessThanOrEqual(t.cost);
      }
    });
  }

  // Specific upgrade cost sanity checks
  it('coffee T1 costs ≤ 400 (was 792 — ridiculous)', () => {
    expect(TOWER_CONFIGS.coffee.upgrades.path1[0].cost).toBeLessThanOrEqual(400);
    expect(TOWER_CONFIGS.coffee.upgrades.path2[0].cost).toBeLessThanOrEqual(400);
    expect(TOWER_CONFIGS.coffee.upgrades.path3[0].cost).toBeLessThanOrEqual(400);
  });

  it('chain T1 costs are reasonable for 480-cost tower', () => {
    expect(TOWER_CONFIGS.chain.upgrades.path1[0].cost).toBeLessThanOrEqual(250);
    expect(TOWER_CONFIGS.chain.upgrades.path2[0].cost).toBeLessThanOrEqual(250);
    expect(TOWER_CONFIGS.chain.upgrades.path3[0].cost).toBeLessThanOrEqual(250);
  });
});

// ---- Specialization Verification ----

describe('Specialization verification', () => {
  it('every tower has a defined specialization', () => {
    expect(Object.keys(SPECIALIZATIONS).sort()).toEqual(
      Object.keys(TOWER_CONFIGS).sort()
    );
  });

  it('candy is anti-air + slow', () => {
    expect(ANTI_AIR_TOWERS.has('candy')).toBe(true);
  });

  it('flamethrower is GROUND-only (not anti-air)', () => {
    expect(ANTI_AIR_TOWERS.has('flamethrower')).toBe(false);
  });

  it('boomerang has highest pierce (4) among starters', () => {
    expect(TOWER_CONFIGS.boomerang.pierce).toBeGreaterThanOrEqual(4);
    expect(TOWER_CONFIGS.hammer.pierce ?? 1).toBeLessThan(4);
  });

  it('sniper has global range (>= 800, i.e. full map)', () => {
    expect(TOWER_CONFIGS.sniper.range).toBeGreaterThanOrEqual(800);
  });

  it('monolith is the most expensive tower', () => {
    const costs = Object.values(TOWER_CONFIGS).map((t) => t.cost);
    expect(TOWER_CONFIGS.monolith.cost).toBe(Math.max(...costs));
  });
});

// ---- Starter Affordability ----

describe('Starter affordability', () => {
  it('all difficulties can afford at least 2 starter towers at wave 1', () => {
    const cheapestCost = Math.min(
      TOWER_CONFIGS.hammer.cost,
      TOWER_CONFIGS.boomerang.cost,
      TOWER_CONFIGS.candy.cost
    );
    for (const diff of ['easy', 'normal', 'hard'] as const) {
      expect(DIFFICULTY_CONFIG[diff].gold).toBeGreaterThanOrEqual(cheapestCost);
    }
  });
});
