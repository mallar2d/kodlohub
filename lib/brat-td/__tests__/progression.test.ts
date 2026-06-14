/**
 * Tests for player progression: XP formula, tower unlock levels, and tier
 * unlock costs. Pure logic only, no Canvas, no React.
 */
import { describe, it, expect } from 'vitest';
import {
  TOWER_UNLOCK_LEVELS,
  TIER_UNLOCK_COSTS,
  PLAYER_LEVEL_CAP,
  getPlayerLevelXpRequirement,
  getPlayerLevelForXp,
  getPlayerLevelProgress,
  getEndlessXpMultiplier,
} from '@/app/(main)/tools/brat-td/gameConfig';

describe('XP formula: 148 * level^1.4', () => {
  it('returns 0 for level 1 (no XP needed to be level 1)', () => {
    expect(getPlayerLevelXpRequirement(1)).toBe(0);
  });

  it('returns 0 for level <= 1', () => {
    expect(getPlayerLevelXpRequirement(0)).toBe(0);
    expect(getPlayerLevelXpRequirement(-1)).toBe(0);
  });

  it('level 2 requires floor(148 * 2^1.4) = 369 XP', () => {
    // 148 * 2^1.4 = 148 * 2.6390... = 390.6..., floor = 390
    const expected = Math.floor(148 * Math.pow(2, 1.4));
    expect(getPlayerLevelXpRequirement(2)).toBe(expected);
    // Spot-check: must be in the right range
    expect(getPlayerLevelXpRequirement(2)).toBeGreaterThanOrEqual(385);
    expect(getPlayerLevelXpRequirement(2)).toBeLessThanOrEqual(395);
  });

  it('level 3 requires floor(148 * 3^1.4) ≈ 776 XP', () => {
    // 148 * 3^1.4 = 148 * 4.6555... = 689.0...
    const expected = Math.floor(148 * Math.pow(3, 1.4));
    expect(getPlayerLevelXpRequirement(3)).toBe(expected);
    expect(getPlayerLevelXpRequirement(3)).toBeGreaterThanOrEqual(685);
    expect(getPlayerLevelXpRequirement(3)).toBeLessThanOrEqual(700);
  });

  it('level 4 requires floor(148 * 4^1.4) ≈ 1249 XP', () => {
    const expected = Math.floor(148 * Math.pow(4, 1.4));
    expect(getPlayerLevelXpRequirement(4)).toBe(expected);
  });

  it('level 5 requires floor(148 * 5^1.4) ≈ 1908 XP', () => {
    // 148 * 5^1.4 = 148 * 9.518... = 1408.7... → floor = 1408
    const expected = Math.floor(148 * Math.pow(5, 1.4));
    expect(getPlayerLevelXpRequirement(5)).toBe(expected);
    expect(getPlayerLevelXpRequirement(5)).toBeGreaterThanOrEqual(1400);
    expect(getPlayerLevelXpRequirement(5)).toBeLessThanOrEqual(1450);
  });

  it('XP requirements strictly increase with level', () => {
    let prev = getPlayerLevelXpRequirement(1);
    for (let level = 2; level <= 20; level++) {
      const current = getPlayerLevelXpRequirement(level);
      expect(current).toBeGreaterThan(prev);
      prev = current;
    }
  });
});

describe('getPlayerLevelForXp', () => {
  it('returns level 1 for 0 XP', () => {
    expect(getPlayerLevelForXp(0)).toBe(1);
  });

  it('returns level 2 after enough XP for level 2', () => {
    const xpForLevel2 = getPlayerLevelXpRequirement(2);
    expect(getPlayerLevelForXp(xpForLevel2)).toBe(2);
    // One less than that keeps us at level 1
    expect(getPlayerLevelForXp(xpForLevel2 - 1)).toBe(1);
  });

  it('returns level 3 after enough XP for level 3', () => {
    const totalXp = getPlayerLevelXpRequirement(2) + getPlayerLevelXpRequirement(3);
    expect(getPlayerLevelForXp(totalXp)).toBe(3);
  });

  it('caps at PLAYER_LEVEL_CAP (50) regardless of massive XP', () => {
    expect(PLAYER_LEVEL_CAP).toBe(50);
    expect(getPlayerLevelForXp(1_000_000_000)).toBe(PLAYER_LEVEL_CAP);
  });
});

describe('getPlayerLevelProgress', () => {
  it('returns level 1, currentXp 0, nextRequirement > 0 for 0 total XP', () => {
    const progress = getPlayerLevelProgress(0);
    expect(progress.level).toBe(1);
    expect(progress.currentXp).toBe(0);
    expect(progress.nextRequirement).toBeGreaterThan(0);
  });

  it('returns next requirement for level 2 when 0 XP', () => {
    const progress = getPlayerLevelProgress(0);
    expect(progress.nextRequirement).toBe(getPlayerLevelXpRequirement(2));
  });

  it('returns nextRequirement = 0 at level cap', () => {
    const totalXp = 1_000_000_000;
    const progress = getPlayerLevelProgress(totalXp);
    expect(progress.level).toBe(PLAYER_LEVEL_CAP);
    expect(progress.nextRequirement).toBe(0);
  });
});

describe('TOWER_UNLOCK_LEVELS: monotonic', () => {
  it('hammer and boomerang unlock at level 1', () => {
    expect(TOWER_UNLOCK_LEVELS.hammer).toBe(1);
    expect(TOWER_UNLOCK_LEVELS.boomerang).toBe(1);
  });

  it('monolith unlocks at level 30 (the highest tier)', () => {
    expect(TOWER_UNLOCK_LEVELS.monolith).toBe(30);
  });

  it('unlock levels are monotonically non-decreasing in declared order', () => {
    const levels = Object.values(TOWER_UNLOCK_LEVELS);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
    }
  });

  it('all 12 towers have an unlock level defined', () => {
    const expectedTowers = [
      'hammer',
      'boomerang',
      'gas',
      'sniper',
      'kladmen',
      'infinix',
      'chain',
      'candy',
      'flamethrower',
      'coffee',
      'bankomat',
      'monolith',
    ];
    for (const tower of expectedTowers) {
      expect(TOWER_UNLOCK_LEVELS[tower]).toBeDefined();
      expect(TOWER_UNLOCK_LEVELS[tower]).toBeTypeOf('number');
      expect(TOWER_UNLOCK_LEVELS[tower]).toBeGreaterThanOrEqual(1);
    }
  });

  it('flamethrower unlocks at level 18', () => {
    expect(TOWER_UNLOCK_LEVELS.flamethrower).toBe(18);
  });
});

describe('TIER_UNLOCK_COSTS', () => {
  it('T3 unlock costs 788', () => {
    expect(TIER_UNLOCK_COSTS[3]).toBe(788);
  });

  it('T4 unlock costs 5500', () => {
    expect(TIER_UNLOCK_COSTS[4]).toBe(5500);
  });

  it('T5 unlock costs 26250', () => {
    expect(TIER_UNLOCK_COSTS[5]).toBe(26250);
  });

  it('tier costs strictly increase from T3 → T4 → T5', () => {
    expect(TIER_UNLOCK_COSTS[3]).toBeLessThan(TIER_UNLOCK_COSTS[4]);
    expect(TIER_UNLOCK_COSTS[4]).toBeLessThan(TIER_UNLOCK_COSTS[5]);
  });

  it('all tier costs are positive numbers', () => {
    for (const tier of Object.keys(TIER_UNLOCK_COSTS)) {
      expect(TIER_UNLOCK_COSTS[Number(tier)]).toBeGreaterThan(0);
    }
  });
});

describe('getEndlessXpMultiplier', () => {
  it('returns 1.0 for waves <= 46 (non-endless)', () => {
    expect(getEndlessXpMultiplier(1)).toBe(1);
    expect(getEndlessXpMultiplier(20)).toBe(1);
    expect(getEndlessXpMultiplier(46)).toBe(1);
  });

  it('returns a positive multiplier for waves 47+', () => {
    expect(getEndlessXpMultiplier(47)).toBeGreaterThan(0);
    expect(getEndlessXpMultiplier(60)).toBeGreaterThan(0);
    expect(getEndlessXpMultiplier(100)).toBeGreaterThan(0);
  });

  it('returns 0.5 (initial endless band) at wave 47', () => {
    // (47-47)/10 = 0 bands → 0.5 * 0.95^0 = 0.5
    expect(getEndlessXpMultiplier(47)).toBe(0.5);
  });

  it('multiplier decays as waves go deeper (formula based on endlessBand)', () => {
    // wave 47: 0.5
    // wave 57: band=1 → 0.5 * 0.95 = 0.475
    expect(getEndlessXpMultiplier(57)).toBeCloseTo(0.5 * Math.pow(0.95, 1), 5);
    // wave 67: band=2 → 0.5 * 0.95^2 ≈ 0.451
    expect(getEndlessXpMultiplier(67)).toBeCloseTo(0.5 * Math.pow(0.95, 2), 5);
  });
});
