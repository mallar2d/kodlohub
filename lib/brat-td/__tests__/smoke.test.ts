/**
 * Smoke test for Brat TD game configuration.
 *
 * Verifies that core game constants from gameConfig.ts load correctly.
 */
import { describe, it, expect } from 'vitest';
import { GAME_WIDTH, GAME_HEIGHT } from '@/app/(main)/tools/brat-td/gameConfig';

describe('Brat TD gameConfig', () => {
  it('should export GAME_WIDTH as a positive number', () => {
    expect(GAME_WIDTH).toBeTypeOf('number');
    expect(GAME_WIDTH).toBeGreaterThan(0);
  });

  it('should export GAME_HEIGHT as a positive number', () => {
    expect(GAME_HEIGHT).toBeTypeOf('number');
    expect(GAME_HEIGHT).toBeGreaterThan(0);
  });
});
