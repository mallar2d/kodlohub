"use client";

import { useEffect, useRef } from "react";
import type { DifficultyKey, ProgressionState } from "@/lib/brat-td/types";
import type { GameSettings } from "@/lib/brat-td/state";

export type SyncTarget<T> = {
  value: T;
  ref: { current: T };
};

export type UseGameSyncConfig = {
  // Reactive fields that need to be mirrored into refs.
  // NOTE: lives and gold are NOT here — they are owned and written by the game
  // engine directly to their refs. Including them here would cause useGameSync
  // to overwrite fresh engine values with stale React state every 150ms.
  wave: SyncTarget<number>;
  isWaveActive: SyncTarget<boolean>;
  gameStatus: SyncTarget<"idle" | "playing" | "gameover" | "victory">;
  isPaused: SyncTarget<boolean>;
  gameSpeed: SyncTarget<1 | 2 | 3 | 5>;
  isAutoStart: SyncTarget<boolean>;
  score: SyncTarget<number>;
  selectedShopTower: SyncTarget<string | null>;
  mousePos: SyncTarget<{ x: number; y: number }>;
  isMouseOnCanvas: SyncTarget<boolean>;
  draggedTowerType: SyncTarget<string | null>;
  draggedTowerPos: SyncTarget<{ x: number; y: number } | null>;
  difficulty: SyncTarget<DifficultyKey>;
  selectedMapId: SyncTarget<string>;
  settings: SyncTarget<GameSettings>;
  progression: SyncTarget<ProgressionState>;
  // Tick interval — keep at 150ms (6 Hz) to match the original behaviour.
  intervalMs?: number;
};

/**
 * Replaces the 18 individual `useEffect(() => { ref.current = state; }, [state])`
 * watchers with a single setInterval loop. Each tracked field is mirrored
 * into its ref on every tick. This is functionally identical to the
 * original 18 useEffects (each just did `ref.current = state`).
 *
 * The 150ms cadence matches the existing periodic React refresh that
 * pushes the game loop's ref writes back into React state — keeping the
 * two intervals in lockstep avoids any visible lag.
 */
export function useGameSync(config: UseGameSyncConfig): void {
  // Read the latest values on every tick — never re-subscribe.
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const tick = () => {
      const c = configRef.current;
      c.wave.ref.current = c.wave.value;
      c.isWaveActive.ref.current = c.isWaveActive.value;
      c.gameStatus.ref.current = c.gameStatus.value;
      c.isPaused.ref.current = c.isPaused.value;
      c.gameSpeed.ref.current = c.gameSpeed.value;
      c.isAutoStart.ref.current = c.isAutoStart.value;
      c.score.ref.current = c.score.value;
      c.selectedShopTower.ref.current = c.selectedShopTower.value;
      c.mousePos.ref.current = c.mousePos.value;
      c.isMouseOnCanvas.ref.current = c.isMouseOnCanvas.value;
      c.draggedTowerType.ref.current = c.draggedTowerType.value;
      c.draggedTowerPos.ref.current = c.draggedTowerPos.value;
      c.difficulty.ref.current = c.difficulty.value;
      c.selectedMapId.ref.current = c.selectedMapId.value;
      c.settings.ref.current = c.settings.value;
      c.progression.ref.current = c.progression.value;
    };

    // Run once immediately so the refs are primed before the first rAF tick.
    tick();
    const id = setInterval(tick, config.intervalMs ?? 150);
    return () => clearInterval(id);
  }, [config.intervalMs]);
}
