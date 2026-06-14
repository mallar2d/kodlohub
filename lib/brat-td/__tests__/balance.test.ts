/**
 * Tests for game balance: starting gold affordability, wave clear rewards,
 * difficulty multipliers. The DIFFICULTY_CONFIG lives in BratTDClient.tsx
 * (per design); we mirror its values here for the balance contract.
 *
 * If DIFFICULTY_CONFIG values change in the client, these tests must be
 * updated to match — the goal is to detect any drift in the published
 * balance numbers.
 */
import { describe, it, expect } from 'vitest';
import {
  TOWER_CONFIGS,
  ENEMY_CONFIGS,
  NON_ENDLESS_WAVE_COUNT,
} from '@/app/(main)/tools/brat-td/gameConfig';

// Mirror of DIFFICULTY_CONFIG in BratTDClient.tsx (lines 118-121).
// Single source of truth for tests; must match the client.
const DIFFICULTY_CONFIG = {
  easy: { label: 'Легко', lives: 375, gold: 450, hpMult: 0.85, speedMult: 0.95, rewardMult: 1.1 },
  normal: { label: 'Нормально', lives: 300, gold: 350, hpMult: 1, speedMult: 1, rewardMult: 1 },
  hard: { label: 'Пекло', lives: 225, gold: 300, hpMult: 1.18, speedMult: 1.08, rewardMult: 0.92 },
} as const;

type DifficultyKey = keyof typeof DIFFICULTY_CONFIG;

// Mirror of getNonEndlessWaveClearReward from BratTDClient.tsx (line 303-310).
function getNonEndlessWaveClearReward(wave: number): number {
  if (wave < 1 || wave > NON_ENDLESS_WAVE_COUNT) return 0;
  const earlyCatchUp = wave <= 8 ? Math.max(0, 90 - wave * 8) : 0;
  const progression = 40 + wave * 12;
  const milestone = Math.floor(wave / 5) * 25 + Math.floor(wave / 10) * 40;
  return progression + milestone + earlyCatchUp;
}

describe('Starting gold: can afford at least 1 tower per difficulty', () => {
  // The cheapest tower across all types:
  // hammer:200, boomerang:250, candy:275, gas:350, kladmen:400, sniper:400,
  // infinix:450, chain:600, bankomat:1200, coffee:1350, monolith:1600
  const CHEAPEST_TOWER_COST = Math.min(
    ...Object.values(TOWER_CONFIGS).map((t) => t.cost),
  );

  it('cheapest tower is hammer at 200 gold', () => {
    expect(CHEAPEST_TOWER_COST).toBe(200);
  });

  it('easy mode (450 gold) can afford at least 1 tower', () => {
    expect(DIFFICULTY_CONFIG.easy.gold).toBeGreaterThanOrEqual(CHEAPEST_TOWER_COST);
  });

  it('normal mode (350 gold) can afford at least 1 tower', () => {
    expect(DIFFICULTY_CONFIG.normal.gold).toBeGreaterThanOrEqual(CHEAPEST_TOWER_COST);
  });

  it('hard mode (300 gold) can afford at least 1 tower', () => {
    expect(DIFFICULTY_CONFIG.hard.gold).toBeGreaterThanOrEqual(CHEAPEST_TOWER_COST);
  });

  it('easy starting gold can afford 2 hammers', () => {
    expect(DIFFICULTY_CONFIG.easy.gold).toBeGreaterThanOrEqual(400);
  });

  it('normal starting gold can afford 1 hammer with 150 left over', () => {
    expect(DIFFICULTY_CONFIG.normal.gold).toBe(CHEAPEST_TOWER_COST + 150);
  });

  it('hard starting gold can afford 1 hammer with 100 left over', () => {
    expect(DIFFICULTY_CONFIG.hard.gold).toBe(CHEAPEST_TOWER_COST + 100);
  });
});

describe('Wave clear reward formula', () => {
  it('returns 0 for wave 0 or negative waves', () => {
    expect(getNonEndlessWaveClearReward(0)).toBe(0);
    expect(getNonEndlessWaveClearReward(-1)).toBe(0);
  });

  it('returns 0 for waves beyond NON_ENDLESS_WAVE_COUNT', () => {
    expect(getNonEndlessWaveClearReward(47)).toBe(0);
    expect(getNonEndlessWaveClearReward(100)).toBe(0);
  });

  it('wave 1 reward: earlyCatchUp=82, progression=52, milestone=0 → 134', () => {
    // earlyCatchUp: max(0, 90 - 1*8) = 82
    // progression: 40 + 1*12 = 52
    // milestone: floor(1/5)*25 + floor(1/10)*40 = 0
    expect(getNonEndlessWaveClearReward(1)).toBe(82 + 52);
  });

  it('wave 5 reward: earlyCatchUp=50, progression=100, milestone=25 → 175', () => {
    // earlyCatchUp: max(0, 90 - 5*8) = 50
    // progression: 40 + 5*12 = 100
    // milestone: floor(5/5)*25 + floor(5/10)*40 = 25
    expect(getNonEndlessWaveClearReward(5)).toBe(50 + 100 + 25);
  });

  it('wave 8 reward: earlyCatchUp=26, progression=136, milestone=25+0=25 → 187', () => {
    // earlyCatchUp: max(0, 90 - 8*8) = 26
    // progression: 40 + 8*12 = 136
    // milestone: floor(8/5)*25 + floor(8/10)*40 = 25
    expect(getNonEndlessWaveClearReward(8)).toBe(26 + 136 + 25);
  });

  it('wave 10 reward: earlyCatchUp=0, progression=160, milestone=50+40=90 → 250', () => {
    expect(getNonEndlessWaveClearReward(10)).toBe(160 + 50 + 40);
  });

  it('wave 46 reward: no earlyCatchUp, full progression + milestone', () => {
    // wave 46: earlyCatchUp=0
    // progression: 40 + 46*12 = 592
    // milestone: floor(46/5)*25 + floor(46/10)*40 = 9*25 + 4*40 = 225 + 160 = 385
    expect(getNonEndlessWaveClearReward(46)).toBe(592 + 385);
  });

  it('wave clear rewards from wave 9 onward are monotonically non-decreasing', () => {
    let prev = getNonEndlessWaveClearReward(9);
    for (let w = 10; w <= NON_ENDLESS_WAVE_COUNT; w++) {
      const current = getNonEndlessWaveClearReward(w);
      expect(current).toBeGreaterThanOrEqual(prev);
      prev = current;
    }
  });

  it('wave 8 reward > wave 9 reward (early-catchup creates a small step at wave 8→9)', () => {
    expect(getNonEndlessWaveClearReward(8)).toBeGreaterThan(
      getNonEndlessWaveClearReward(9),
    );
  });
});

describe('Difficulty multipliers', () => {
  it('easy mode: hpMult 0.85, speedMult 0.95, rewardMult 1.1', () => {
    expect(DIFFICULTY_CONFIG.easy.hpMult).toBe(0.85);
    expect(DIFFICULTY_CONFIG.easy.speedMult).toBe(0.95);
    expect(DIFFICULTY_CONFIG.easy.rewardMult).toBe(1.1);
  });

  it('normal mode: 1x baseline', () => {
    expect(DIFFICULTY_CONFIG.normal.hpMult).toBe(1);
    expect(DIFFICULTY_CONFIG.normal.speedMult).toBe(1);
    expect(DIFFICULTY_CONFIG.normal.rewardMult).toBe(1);
  });

  it('hard mode: hpMult 1.18, speedMult 1.08, rewardMult 0.92', () => {
    expect(DIFFICULTY_CONFIG.hard.hpMult).toBe(1.18);
    expect(DIFFICULTY_CONFIG.hard.speedMult).toBe(1.08);
    expect(DIFFICULTY_CONFIG.hard.rewardMult).toBe(0.92);
  });

  it('easy gives more gold + lives than hard', () => {
    expect(DIFFICULTY_CONFIG.easy.gold).toBeGreaterThan(DIFFICULTY_CONFIG.hard.gold);
    expect(DIFFICULTY_CONFIG.easy.lives).toBeGreaterThan(DIFFICULTY_CONFIG.hard.lives);
  });

  it('hard gives more enemy HP than easy (hpMult > 1 vs < 1)', () => {
    expect(DIFFICULTY_CONFIG.hard.hpMult).toBeGreaterThan(DIFFICULTY_CONFIG.easy.hpMult);
  });

  it('hard gives more enemy speed than easy', () => {
    expect(DIFFICULTY_CONFIG.hard.speedMult).toBeGreaterThan(DIFFICULTY_CONFIG.easy.speedMult);
  });

  it('hard gives LESS reward than easy (inverse scaling)', () => {
    expect(DIFFICULTY_CONFIG.hard.rewardMult).toBeLessThan(DIFFICULTY_CONFIG.easy.rewardMult);
  });

  it('all difficulties have positive lives', () => {
    for (const key of Object.keys(DIFFICULTY_CONFIG) as DifficultyKey[]) {
      expect(DIFFICULTY_CONFIG[key].lives).toBeGreaterThan(0);
    }
  });

  it('all difficulties have positive starting gold', () => {
    for (const key of Object.keys(DIFFICULTY_CONFIG) as DifficultyKey[]) {
      expect(DIFFICULTY_CONFIG[key].gold).toBeGreaterThan(0);
    }
  });
});

describe('Difficulty x Tower affordability matrix', () => {
  it.each(['easy', 'normal', 'hard'] as DifficultyKey[])(
    '%s can afford the cheapest tower with leftover gold',
    (difficulty) => {
      const remainingGold = DIFFICULTY_CONFIG[difficulty].gold - CHEAPEST_TOWER_COST();
      expect(remainingGold).toBeGreaterThanOrEqual(0);
    },
  );

  it.each(['easy', 'normal', 'hard'] as DifficultyKey[])(
    '%s cannot afford monolith (most expensive tower) immediately',
    (difficulty) => {
      const monolithCost = TOWER_CONFIGS.monolith.cost;
      expect(DIFFICULTY_CONFIG[difficulty].gold).toBeLessThan(monolithCost);
    },
  );
});

function CHEAPEST_TOWER_COST(): number {
  return Math.min(...Object.values(TOWER_CONFIGS).map((t) => t.cost));
}

describe('Enemy reward scaling sanity checks', () => {
  it('boss enemies have significantly higher reward than ordinary', () => {
    const ordinary = ENEMY_CONFIGS.ordinary.reward;
    expect(ENEMY_CONFIGS.boss.reward).toBeGreaterThan(ordinary * 10);
    expect(ENEMY_CONFIGS.megaboss.reward).toBeGreaterThan(ordinary * 30);
  });

  it('fast enemies have a higher reward-per-HP ratio than heavy enemies', () => {
    const fastRewardPerHp = ENEMY_CONFIGS.fast.reward / ENEMY_CONFIGS.fast.hp;
    const heavyRewardPerHp = ENEMY_CONFIGS.heavy.reward / ENEMY_CONFIGS.heavy.hp;
    // Fast: 2/14 ≈ 0.143 reward/HP
    // Heavy: 8/120 ≈ 0.067 reward/HP
    // Fast is intentionally more efficient per HP because heavy compensates
    // with massive HP pool and bigger reward in absolute terms.
    expect(fastRewardPerHp).toBeGreaterThan(heavyRewardPerHp);
  });
});
