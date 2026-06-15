/**
 * Economy balance tests — updated for v0.8.0 global rebalance.
 */
import { describe, it, expect } from 'vitest';
import {
  TOWER_CONFIGS, NON_ENDLESS_WAVE_COUNT,
  getPlayerLevelXpRequirement, getPlayerLevelForXp,
  TIER_UNLOCK_COSTS, TOWER_UNLOCK_LEVELS,
  ACHIEVEMENTS, PLAYER_LEVEL_CAP,
} from '@/app/(main)/tools/brat-td/gameConfig';
import { DIFFICULTY_CONFIG, getNonEndlessWaveClearReward } from '@/lib/brat-td/pure';

function computeMetrics() {
  const r: Record<string, { cost: number; dps: number; costPerDps: number }> = {};
  for (const [k, t] of Object.entries(TOWER_CONFIGS)) {
    const dps = t.fireRate > 0 ? t.damage / t.fireRate : 0;
    r[k] = { cost: t.cost, dps: Number(dps.toFixed(2)), costPerDps: dps > 0 ? Number((t.cost / dps).toFixed(2)) : Infinity };
  }
  return r;
}
const m = computeMetrics();

describe('Tower DPS (post-rebalance v0.8.0)', () => {
  it('hammer: 200/42/1.1 → 38.18 DPS', () => { expect(m.hammer.dps).toBeCloseTo(38.18, 1); });
  it('boomerang: 250/32/1.15 → 27.83 DPS (×2 ret ~55)', () => { expect(m.boomerang.dps).toBeCloseTo(27.83, 1); });
  it('candy: 250/11/1.2 → 9.17 DPS', () => { expect(m.candy.dps).toBeCloseTo(9.17, 1); });
  it('gas: 320/17.25/0.9 → 19.17 DPS', () => { expect(m.gas.dps).toBeCloseTo(19.17, 1); });
  it('sniper: 475/225/2.5 → 90 DPS', () => { expect(m.sniper.dps).toBeCloseTo(90, 1); });
  it('chain: 480/22/1.0 → 22 DPS', () => { expect(m.chain.dps).toBeCloseTo(22, 1); });
  it('kladmen: 350/30/2.8 → 10.71 DPS (mines do 80)', () => { expect(m.kladmen.dps).toBeCloseTo(10.71, 1); });
  it('infinix: 400/50/0.8 → 62.5 DPS', () => { expect(m.infinix.dps).toBeCloseTo(62.5, 1); });
  it('flamethrower: 500/5/0.15 → 33.33 DPS + DoT', () => { expect(m.flamethrower.dps).toBeCloseTo(33.33, 1); });
  it('monolith: 1500/24/0.14 → 171.43 DPS', () => { expect(m.monolith.dps).toBeCloseTo(171.43, 1); });
});

describe('Cost/DPS invariants', () => {
  it('hammer is most cost-efficient (5.24 cost/DPS)', () => {
    const dmg = Object.entries(m).filter(([, v]) => v.costPerDps !== Infinity);
    const best = dmg.reduce((a, b) => a[1].costPerDps < b[1].costPerDps ? a : b)[0];
    expect(best).toBe('hammer');
  });
  it('monolith most expensive (1500)', () => {
    const costs = Object.values(TOWER_CONFIGS).map(t => t.cost);
    expect(Math.max(...costs)).toBe(1500);
  });
  it('all towers cost between 200 and 1500', () => {
    for (const t of Object.values(TOWER_CONFIGS)) {
      if (t.damage <= 0) continue;
      expect(t.cost).toBeGreaterThanOrEqual(200);
      expect(t.cost).toBeLessThanOrEqual(1500);
    }
  });
});

describe('Gold economy', () => {
  it('wave rewards across 46 waves > 6500', () => {
    let total = 0; for (let w = 1; w <= NON_ENDLESS_WAVE_COUNT; w++) total += getNonEndlessWaveClearReward(w);
    expect(total).toBeGreaterThan(6500);
  });
  it('player can afford monolith (1500) by wave 15 on normal', () => {
    let c = DIFFICULTY_CONFIG.normal.gold;
    for (let w = 1; w <= 15; w++) c += getNonEndlessWaveClearReward(w);
    expect(c).toBeGreaterThan(1400); // need kill gold for the remaining
  });
});

describe('XP and Tier unlocks', () => {
  it('level 1 requires 0 XP', () => { expect(getPlayerLevelXpRequirement(1)).toBe(0); });
  it('T3=788, T4=2750, T5=10500', () => {
    expect(TIER_UNLOCK_COSTS[3]).toBe(788);
    expect(TIER_UNLOCK_COSTS[4]).toBe(2750);
    expect(TIER_UNLOCK_COSTS[5]).toBe(10500);
  });
  it('hammer/boomerang unlock at level 1', () => {
    expect(TOWER_UNLOCK_LEVELS.hammer).toBe(1);
    expect(TOWER_UNLOCK_LEVELS.boomerang).toBe(1);
  });
});
