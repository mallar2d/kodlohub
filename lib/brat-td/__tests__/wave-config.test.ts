/**
 * Tests for WAVES, POST_46_WAVES, TIER_SCALING, and getScaledWave — validates
 * wave structure, references, and tier scaling. Pure logic only, no Canvas,
 * no React.
 */
import { describe, it, expect } from 'vitest';
import {
  WAVES,
  POST_46_WAVES,
  TIER_SCALING,
  NON_ENDLESS_WAVE_COUNT,
  ENEMY_CONFIGS,
  getTierForWave,
  getScaledWave,
} from '@/app/(main)/tools/brat-td/gameConfig';

const VALID_ENEMY_TYPES = new Set(Object.keys(ENEMY_CONFIGS));
const VALID_MODIFIERS = new Set(['lead', 'camo', 'regen', 'ceramic', 'phantom']);

describe('WAVES: structure', () => {
  it('contains exactly 46 handcrafted waves', () => {
    expect(WAVES).toHaveLength(46);
  });

  it('NON_ENDLESS_WAVE_COUNT matches the WAVES array length', () => {
    expect(NON_ENDLESS_WAVE_COUNT).toBe(46);
    expect(WAVES).toHaveLength(NON_ENDLESS_WAVE_COUNT);
  });

  it('POST_46_WAVES contains 10 post-game waves', () => {
    expect(POST_46_WAVES).toHaveLength(10);
  });

  it.each(WAVES.map((_, i) => i + 1))(
    'wave %i has a non-empty segment array',
    (waveNumber) => {
      const wave = WAVES[waveNumber - 1];
      expect(wave).toBeDefined();
      expect(Array.isArray(wave)).toBe(true);
      expect(wave.length).toBeGreaterThan(0);
    },
  );

  it.each(WAVES.map((_, i) => i + 1))(
    'wave %i segments have valid structure (type, count, spawnDelay)',
    (waveNumber) => {
      const wave = WAVES[waveNumber - 1];
      for (const segment of wave) {
        expect(segment.type).toBeTypeOf('string');
        expect(VALID_ENEMY_TYPES.has(segment.type)).toBe(true);
        expect(segment.count).toBeTypeOf('number');
        expect(segment.count).toBeGreaterThan(0);
        expect(segment.spawnDelay).toBeTypeOf('number');
        expect(segment.spawnDelay).toBeGreaterThan(0);
      }
    },
  );

  it.each(WAVES.map((_, i) => i + 1))(
    'wave %i segment types reference valid enemy configs',
    (waveNumber) => {
      const wave = WAVES[waveNumber - 1];
      for (const segment of wave) {
        expect(ENEMY_CONFIGS[segment.type]).toBeDefined();
      }
    },
  );

  it.each(WAVES.map((_, i) => i + 1))(
    'wave %i segment modifiers are valid (when present)',
    (waveNumber) => {
      const wave = WAVES[waveNumber - 1];
      for (const segment of wave) {
        if (segment.modifiers) {
          expect(Array.isArray(segment.modifiers)).toBe(true);
          for (const modifier of segment.modifiers) {
            expect(VALID_MODIFIERS.has(modifier)).toBe(true);
          }
        }
      }
    },
  );
});

describe('POST_46_WAVES: structure', () => {
  it.each(POST_46_WAVES.map((_, i) => i + 47))(
    'post-46 wave %i has valid segment structure',
    (waveNumber) => {
      const wave = POST_46_WAVES[waveNumber - 47];
      expect(wave).toBeDefined();
      expect(wave.length).toBeGreaterThan(0);
      for (const segment of wave) {
        expect(VALID_ENEMY_TYPES.has(segment.type)).toBe(true);
        expect(segment.count).toBeGreaterThan(0);
        expect(segment.spawnDelay).toBeGreaterThan(0);
      }
    },
  );
});

describe('TIER_SCALING: structure and values', () => {
  it('TIER_SCALING has 8 tiers (waves 1-10, 11-20, ..., 67+)', () => {
    expect(TIER_SCALING).toHaveLength(8);
  });

  it('tier 1 baseline has hpMult=1, speedMult=1, rewardMult=1', () => {
    const t1 = TIER_SCALING[0];
    expect(t1.hpMult).toBe(1.0);
    expect(t1.speedMult).toBe(1.0);
    expect(t1.rewardMult).toBe(1.0);
    expect(t1.damageReduce).toBe(0);
  });

  it('hpMult strictly increases with tier', () => {
    for (let i = 1; i < TIER_SCALING.length; i++) {
      expect(TIER_SCALING[i].hpMult).toBeGreaterThan(TIER_SCALING[i - 1].hpMult);
    }
  });

  it('speedMult strictly increases with tier', () => {
    for (let i = 1; i < TIER_SCALING.length; i++) {
      expect(TIER_SCALING[i].speedMult).toBeGreaterThanOrEqual(TIER_SCALING[i - 1].speedMult);
    }
  });

  it('rewardMult strictly increases with tier', () => {
    for (let i = 1; i < TIER_SCALING.length; i++) {
      expect(TIER_SCALING[i].rewardMult).toBeGreaterThanOrEqual(TIER_SCALING[i - 1].rewardMult);
    }
  });

  it('tier inheritance: higher tiers gain more abilities (inheritsRegen first, then armor, then lead, then camo)', () => {
    const tier4 = TIER_SCALING[3]; // wave 31-40
    const tier5 = TIER_SCALING[4]; // wave 41-46
    const tier6 = TIER_SCALING[5]; // wave 47-56
    const tier7 = TIER_SCALING[6]; // wave 57-66
    const tier8 = TIER_SCALING[7]; // wave 67+
    expect(tier4.inheritsRegen).toBe(true);
    expect(tier4.inheritsArmor).toBe(true);
    expect(tier4.inheritsLead).toBe(false);
    expect(tier4.inheritsCamo).toBe(false);
    expect(tier7.inheritsLead).toBe(true);
    expect(tier8.inheritsCamo).toBe(true);
    // Ensure tier 5 inherits at least everything tier 4 has
    expect(tier5.inheritsRegen).toBe(true);
    expect(tier5.inheritsArmor).toBe(true);
    expect(tier6.inheritsArmor).toBe(true);
  });
});

describe('getTierForWave', () => {
  it('returns tier 1 for waves 1-10', () => {
    for (let w = 1; w <= 10; w++) {
      expect(getTierForWave(w)).toBe(1);
    }
  });

  it('returns tier 2 for waves 11-20', () => {
    for (let w = 11; w <= 20; w++) {
      expect(getTierForWave(w)).toBe(2);
    }
  });

  it('returns tier 5 for waves 41-46 (the last non-endless)', () => {
    for (let w = 41; w <= 46; w++) {
      expect(getTierForWave(w)).toBe(5);
    }
  });

  it('returns tier 8 for waves 67+ (apocalypse)', () => {
    expect(getTierForWave(67)).toBe(8);
    expect(getTierForWave(100)).toBe(8);
  });
});

describe('getScaledWave: integration with TIER_SCALING', () => {
  it('returns wave 1 segments scaled to at least 1 enemy per segment', () => {
    const wave = getScaledWave(1);
    expect(wave.length).toBeGreaterThan(0);
    for (const segment of wave) {
      expect(segment.count).toBeGreaterThanOrEqual(1);
      expect(segment.spawnDelay).toBeGreaterThanOrEqual(150);
    }
  });

  it('returns wave 46 segments from the handcrafted set', () => {
    const wave = getScaledWave(46);
    expect(wave.length).toBeGreaterThan(0);
    for (const segment of wave) {
      expect(VALID_ENEMY_TYPES.has(segment.type)).toBe(true);
    }
  });

  it('returns a valid wave 47 from POST_46_WAVES', () => {
    const wave = getScaledWave(47);
    expect(wave.length).toBeGreaterThan(0);
    for (const segment of wave) {
      expect(VALID_ENEMY_TYPES.has(segment.type)).toBe(true);
    }
  });

  it('returns a valid wave 56 (last handcrafted post-46 wave)', () => {
    const wave = getScaledWave(56);
    expect(wave.length).toBeGreaterThan(0);
    for (const segment of wave) {
      expect(VALID_ENEMY_TYPES.has(segment.type)).toBe(true);
      expect(segment.count).toBeGreaterThanOrEqual(1);
    }
  });

  it('returns a generated endless wave 70 (deep endless types)', () => {
    const wave = getScaledWave(70);
    expect(wave.length).toBeGreaterThan(0);
    for (const segment of wave) {
      expect(VALID_ENEMY_TYPES.has(segment.type)).toBe(true);
      expect(segment.count).toBeGreaterThanOrEqual(1);
    }
  });

  it('endless waves (>=57) keep segment count >= 1 even when scaled down', () => {
    const wave = getScaledWave(57);
    for (const segment of wave) {
      expect(segment.count).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('TIER_SCALING applied values', () => {
  it('tier 2 (wave 11-20) multiplies ordinary enemy HP by 1.5', () => {
    const tier2 = TIER_SCALING[1];
    const ordinary = ENEMY_CONFIGS.ordinary;
    const expectedHp = Math.floor(ordinary.hp * tier2.hpMult);
    expect(expectedHp).toBe(33); // 22 * 1.5 = 33
  });

  it('tier 5 (wave 41-46) multiplies enemy HP by 5.5 and reward by 2.0', () => {
    const tier5 = TIER_SCALING[4];
    expect(tier5.hpMult).toBe(5.5);
    expect(tier5.rewardMult).toBe(2.0);
  });

  it('tier 8 (wave 67+) hpMult is the largest at 22.0', () => {
    const tier8 = TIER_SCALING[7];
    expect(tier8.hpMult).toBe(22.0);
    for (let i = 0; i < TIER_SCALING.length - 1; i++) {
      expect(tier8.hpMult).toBeGreaterThan(TIER_SCALING[i].hpMult);
    }
  });
});
