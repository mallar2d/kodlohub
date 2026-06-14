/**
 * Tests for player progression: XP formula, tower unlock levels, and tier
 * unlock costs. Pure logic only, no Canvas, no React.
 */
import { describe, it, expect } from 'vitest';
import {
  TOWER_CONFIGS,
  ACHIEVEMENTS,
  TOWER_UNLOCK_LEVELS,
  TIER_UNLOCK_COSTS,
  PLAYER_LEVEL_CAP,
  getPlayerLevelXpRequirement,
  getPlayerLevelForXp,
  getPlayerLevelProgress,
  getEndlessXpMultiplier,
} from '@/app/(main)/tools/brat-td/gameConfig';
import { MAP_CONFIGS } from '@/lib/brat-td/maps';
import { normalizeProgression } from '@/lib/brat-td/state';

describe('XP formula: 82 * level^1.4', () => {
  it('returns 0 for level 1 (no XP needed to be level 1)', () => {
    expect(getPlayerLevelXpRequirement(1)).toBe(0);
  });

  it('returns 0 for level <= 1', () => {
    expect(getPlayerLevelXpRequirement(0)).toBe(0);
    expect(getPlayerLevelXpRequirement(-1)).toBe(0);
  });

  it('level 2 requires floor(82 * 2^1.4) = 216 XP', () => {
    const expected = Math.floor(82 * Math.pow(2, 1.4));
    expect(getPlayerLevelXpRequirement(2)).toBe(expected);
    // Spot-check: must be in the right range
    expect(getPlayerLevelXpRequirement(2)).toBeGreaterThanOrEqual(210);
    expect(getPlayerLevelXpRequirement(2)).toBeLessThanOrEqual(225);
  });

  it('level 3 requires floor(82 * 3^1.4) ≈ 381 XP', () => {
    const expected = Math.floor(82 * Math.pow(3, 1.4));
    expect(getPlayerLevelXpRequirement(3)).toBe(expected);
    expect(getPlayerLevelXpRequirement(3)).toBeGreaterThanOrEqual(375);
    expect(getPlayerLevelXpRequirement(3)).toBeLessThanOrEqual(390);
  });

  it('level 4 requires floor(82 * 4^1.4) ≈ 571 XP', () => {
    const expected = Math.floor(82 * Math.pow(4, 1.4));
    expect(getPlayerLevelXpRequirement(4)).toBe(expected);
  });

  it('level 5 requires floor(82 * 5^1.4) ≈ 780 XP', () => {
    const expected = Math.floor(82 * Math.pow(5, 1.4));
    expect(getPlayerLevelXpRequirement(5)).toBe(expected);
    expect(getPlayerLevelXpRequirement(5)).toBeGreaterThanOrEqual(770);
    expect(getPlayerLevelXpRequirement(5)).toBeLessThanOrEqual(790);
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

  it('caps at PLAYER_LEVEL_CAP (9999) regardless of massive XP', () => {
    expect(PLAYER_LEVEL_CAP).toBe(9999);
    expect(getPlayerLevelForXp(1_000_000_000_000)).toBe(PLAYER_LEVEL_CAP);
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
    const totalXp = 1_000_000_000_000;
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

  it('T4 unlock costs 2750', () => {
    expect(TIER_UNLOCK_COSTS[4]).toBe(2750);
  });

  it('T5 unlock costs 10500', () => {
    expect(TIER_UNLOCK_COSTS[5]).toBe(10500);
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

describe('Progression State: Server-side validation & normalization', () => {
  const normConfig = {
    towerConfigs: TOWER_CONFIGS,
    mapConfigs: MAP_CONFIGS,
    achievements: ACHIEVEMENTS,
    getPlayerLevelForXp,
    towerUnlockLevels: TOWER_UNLOCK_LEVELS,
  };

  it('rejects custom/cheated starting gold and lives, recalculating strictly from achievements', () => {
    const rawPayload = {
      totalXp: 1000,
      achievements: ['first_wave', 'tower_farm'],
      bonusStartGold: 5000, // cheat!
      bonusLives: 9999,      // cheat!
    };
    const res = normalizeProgression(rawPayload as any, normConfig);
    // first_wave reward is 50, tower_farm reward is 25. Total = 75.
    expect(res.bonusStartGold).toBe(75);
    // No achievements give bonus lives, so it should be 0.
    expect(res.bonusLives).toBe(0);
  });

  it('rejects locked towers that exceed player level unlock requirements', () => {
    const rawPayload = {
      totalXp: 0, // Level 1
      unlockedTowers: ['hammer', 'boomerang', 'monolith', 'bankomat'], // Monolith requires lvl 30, bankomat 25
    };
    const res = normalizeProgression(rawPayload as any, normConfig);
    expect(res.unlockedTowers).toContain('hammer');
    expect(res.unlockedTowers).toContain('boomerang');
    expect(res.unlockedTowers).not.toContain('monolith');
    expect(res.unlockedTowers).not.toContain('bankomat');
  });

  it('rejects path upgrades (T3/T4/T5) if continuity rules are broken or level requirement for T5 is not met', () => {
    const rawPayload = {
      totalXp: 0, // Level 1 (cannot unlock T5, which requires level 25)
      towerMastery: {
        hammer: {
          towerXp: 0,
          unlockedTiers: ['1:3', '1:5', '2:4'], // P1T5 has no T4, P2T4 has no T3
          highestTierAchieved: 2,
        }
      }
    };
    const res = normalizeProgression(rawPayload as any, normConfig);
    const hammerMastery = res.towerMastery.hammer;
    expect(hammerMastery.unlockedTiers).toContain('1:3');
    // '1:5' is rejected because player level < 25 and P1T4 is not unlocked
    expect(hammerMastery.unlockedTiers).not.toContain('1:5');
    // '2:4' is rejected because P2T3 is not unlocked
    expect(hammerMastery.unlockedTiers).not.toContain('2:4');
  });

  it('filters out level achievements if the player level is too low', () => {
    const rawPayload = {
      totalXp: 0, // Level 1
      achievements: ['level_10', 'level_50', 'first_wave'],
    };
    const res = normalizeProgression(rawPayload as any, normConfig);
    expect(res.achievements).toContain('first_wave');
    expect(res.achievements).not.toContain('level_10');
    expect(res.achievements).not.toContain('level_50');
  });
});
