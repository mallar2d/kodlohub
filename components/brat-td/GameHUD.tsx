/**
 * Game HUD — the top bar with HP / gold / score / wave progress + the
 * control buttons (pause / speed / auto-start / next wave / start).
 *
 * Extracted from BratTDClient.tsx (Task 12).
 */

import React from "react";

export interface GameHUDProps {
  lives: number;
  gold: number;
  score: number;
  wave: number;
  isEndless: boolean;
  isSandbox?: boolean;
  isWaveActive: boolean;
  isPaused: boolean;
  gameSpeed: 1 | 2 | 3 | 5;
  isAutoStart: boolean;
  gameStatus: "idle" | "playing" | "gameover" | "victory";
  // Refs (read-only) for the enemy counter
  remainingEnemies: number;
  remainingHp: number;
  totalEnemies: number;
  // Actions
  onTogglePause: () => void;
  onCycleSpeed: () => void;
  onToggleAutoStart: () => void;
  onStartNextWave: () => void;
  onStartGame: () => void;
}

export function GameHUD(props: GameHUDProps) {
  const {
    lives,
    gold,
    score,
    wave,
    isEndless,
    isSandbox,
    isWaveActive,
    isPaused,
    gameSpeed,
    isAutoStart,
    gameStatus,
    remainingEnemies,
    remainingHp,
    totalEnemies,
    onTogglePause,
    onCycleSpeed,
    onToggleAutoStart,
    onStartNextWave,
    onStartGame,
  } = props;

  const enemyPct = totalEnemies > 0 ? Math.max(0, Math.min(100, (remainingEnemies / totalEnemies) * 100)) : 0;

  return (
    <div className="card-dark p-4 flex flex-wrap items-center justify-between gap-4 border-hairline-dark">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Stat
          label={isSandbox ? "Життя (∞)" : "Нерви Кодла (HP)"}
          value={lives}
          variant={isSandbox ? "gold" : lives <= 35 ? "danger" : "normal"}
          showHpBar={!isSandbox}
        />
        <Stat
          label="Nescafe Gold (Валюта)"
          value={gold}
          variant="gold"
        />
        {!isSandbox && (
          <Stat
            label="Score"
            value={score}
            variant="purple"
          />
        )}
        <div className="flex flex-col min-w-[140px] h-[52px] justify-between">
          <span className="micro-cap text-ink-mute whitespace-nowrap">
            Накат Братви (Хвиля)
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="rounded border border-cyan-900/70 bg-cyan-950/40 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">
              WAVE
            </span>
            <span className="text-xl font-bold font-[var(--font-display)] text-on-primary">
              {wave}{" "}
              {isEndless && (
                <span className="text-xs text-purple-400 font-normal">Endless</span>
              )}
              {isSandbox && (
                <span className="text-xs text-amber-400 font-normal ml-1">Sandbox</span>
              )}
            </span>
            {isWaveActive && (
              <div className="flex items-center gap-1.5 ml-1">
                <div className="w-14 h-1.5 bg-zinc-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 transition-all duration-150"
                    style={{ width: `${100 - enemyPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-ink-mute font-mono whitespace-nowrap">
                  {remainingEnemies}/{totalEnemies} ({Math.round(remainingHp / 1000)}к HP)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {gameStatus === "playing" && (
          <>
            <button
              onClick={onTogglePause}
              className="px-4 py-2 border border-hairline-dark rounded hover:bg-canvas-night-soft text-sm font-bold micro-cap"
            >
              {isPaused ? "Продовжити" : "Пауза"}
            </button>
            <button
              onClick={onCycleSpeed}
              className="px-4 py-2 border border-hairline-dark rounded hover:bg-canvas-night-soft text-sm font-bold text-cyan-400 micro-cap"
              aria-label={`Швидкість гри: ${gameSpeed}x. Натисніть для перемикання`}
              aria-pressed={gameSpeed > 1}
            >
              Швидкість: {gameSpeed}x
            </button>
            <button
              onClick={onToggleAutoStart}
              className={`px-4 py-2 border rounded text-sm font-bold micro-cap transition-all ${
                isAutoStart
                  ? "bg-cyan-950/50 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                  : "border-hairline-dark hover:bg-canvas-night-soft text-ink-mute"
              }`}
            >
              Авто-накат: {isAutoStart ? "УВМ" : "ВИМК"}
            </button>
            {!isWaveActive && (
              <button
                onClick={onStartNextWave}
                className="px-6 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 text-sm font-bold button-cap"
              >
                Почати накат
              </button>
            )}
          </>
        )}

        {gameStatus === "idle" && (
          <button
            onClick={onStartGame}
            className="px-6 py-3 bg-cyan-600 text-white rounded hover:bg-cyan-500 font-bold button-cap"
          >
            Почати гру
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  variant,
  showHpBar,
}: {
  label: string;
  value: number;
  variant: "normal" | "danger" | "gold" | "purple";
  showHpBar?: boolean;
}) {
  const valueClass =
    variant === "danger"
      ? "text-red-500 animate-pulse"
      : variant === "gold"
      ? "text-yellow-500"
      : variant === "purple"
      ? "text-purple-400"
      : "text-on-primary";
  const badgeClass =
    variant === "danger"
      ? "border-red-900/70 bg-red-950/40 text-red-300"
      : variant === "gold"
      ? "border-yellow-900/70 bg-yellow-950/40 text-yellow-300"
      : variant === "purple"
      ? "border-purple-900/70 bg-purple-950/40 text-purple-300"
      : "";
  const badge = variant === "danger" ? "HP" : variant === "gold" ? "GOLD" : variant === "purple" ? "PTS" : null;
  return (
    <div className="flex flex-col h-[52px] justify-between">
      <span className="micro-cap text-ink-mute whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-2 mt-0.5">
        {badge && (
          <span
            className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${badgeClass}`}
          >
            {badge}
          </span>
        )}
        <span className={`text-xl font-bold font-[var(--font-display)] ${valueClass} min-w-[3ch]`}>
          {value}
        </span>
        {showHpBar && (
          <div className="w-16 h-2 bg-zinc-800 rounded overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                variant === "danger" ? "bg-red-500" : "bg-green-500"
              }`}
              style={{ width: `${value}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
