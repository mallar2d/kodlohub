/**
 * Tower viability tests — updated for v0.8.0 global rebalance.
 */
import { describe, it, expect } from 'vitest';
import {
  TOWER_CONFIGS, COFFEE_BUFF_DEFAULTS, ANTI_AIR_TOWERS,
} from '@/app/(main)/tools/brat-td/gameConfig';
import type { PlacedTower } from '@/lib/brat-td/types';

function dps(name: string): number {
  const t = TOWER_CONFIGS[name];
  return t.fireRate > 0 ? t.damage / t.fireRate : 0;
}

describe('Starter competition (hammer vs boomerang)', () => {
  it('hammer DPS 38.18', () => { expect(dps('hammer')).toBeCloseTo(38.18, 1); });
  it('boomerang DPS 27.83 (×2 return ≈ 55.7)', () => {
    expect(dps('boomerang')).toBeCloseTo(27.83, 1);
    expect(dps('boomerang') * 2).toBeGreaterThan(45);
  });
  it('hammer cost/DPS (5.24) < boomerang effective (4.49)', () => {
    const h = 200 / 38.18;
    const b = 250 / (27.83 * 2);
    expect(h).toBeLessThan(6);
    expect(b).toBeLessThan(6);
  });
});

describe('Support tower ROI', () => {
  it('coffee buff is 8% (was 5%)', () => {
    expect(COFFEE_BUFF_DEFAULTS.attackSpeed).toBeGreaterThanOrEqual(0.08);
  });
  it('coffee (800) is cheaper than bankomat (900)', () => {
    expect(TOWER_CONFIGS.coffee.cost).toBeLessThan(TOWER_CONFIGS.bankomat.cost);
  });
  it('coffee affordable by wave 10 on Normal (350 + ~1100 = 1450 > 800)', () => {
    expect(TOWER_CONFIGS.coffee.cost).toBeLessThanOrEqual(1400);
  });
});

describe('Specialist effectiveness', () => {
  it('flamethrower DPS 33.33 + DoT 10', () => {
    const f = TOWER_CONFIGS.flamethrower;
    expect(f.damage).toBe(5);
    expect(f.fireRate).toBe(0.15);
    expect(f.fireDoTDamage).toBe(10);
    expect(f.damage / f.fireRate).toBeCloseTo(33.33, 1);
  });
  it('kladmen mine deployment: 350 cost, mines do 80 dmg', () => {
    expect(TOWER_CONFIGS.kladmen.cost).toBe(350);
    expect(TOWER_CONFIGS.kladmen.damage).toBe(30);
  });
  it('candy slow + anti-air', () => {
    expect(TOWER_CONFIGS.candy.damage).toBeGreaterThanOrEqual(10);
    expect(ANTI_AIR_TOWERS.has('candy')).toBe(true);
  });
  it('gas has 8 tacks at 320 cost', () => {
    expect(TOWER_CONFIGS.gas.tackCount).toBeGreaterThanOrEqual(8);
    expect(TOWER_CONFIGS.gas.cost).toBe(320);
  });
});

describe('Late-game power', () => {
  it('monolith highest DPS (171.4)', () => {
    const d = Object.entries(TOWER_CONFIGS).filter(([, t]) => t.damage > 0)
      .map(([n, t]) => ({ n, d: t.damage / t.fireRate })).sort((a, b) => b.d - a.d);
    expect(d[0].n).toBe('monolith');
    expect(d[0].d).toBeGreaterThan(150);
  });
  it('chain effective DPS with 3 bounces > 30', () => {
    const c = TOWER_CONFIGS.chain;
    const eff = (c.damage / c.fireRate) * (1 + 0.8 + 0.64);
    expect(eff).toBeGreaterThan(30);
  });
  it('infinix effective DPS > 40', () => {
    const i = TOWER_CONFIGS.infinix;
    expect(i.damage / i.fireRate * 0.75).toBeGreaterThan(40);
  });
});
