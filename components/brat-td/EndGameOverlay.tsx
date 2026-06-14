/**
 * End-game overlays — game-over and victory screens with submit-score
 * form, leaderboard preview, and restart / endless buttons.
 *
 * Extracted from BratTDClient.tsx (Task 12).
 */

import React from "react";
import type { LeaderboardEntry, SessionSummary } from "@/lib/brat-td/types";
import { LeaderboardPreview, SessionSummaryPanel } from "@/components/brat-td/SessionPanels";

export interface EndGameOverlayProps {
  variant: "gameover" | "victory";
  score: number;
  wave: number;
  sessionSummary: SessionSummary | null;
  scoreSubmitted: boolean;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  onSubmitScore: () => void;
  onRestart: () => void;
  onEndless?: () => void;
  leaderboard: LeaderboardEntry[];
}

export function EndGameOverlay(props: EndGameOverlayProps) {
  const {
    variant,
    score,
    wave,
    sessionSummary,
    scoreSubmitted,
    playerName,
    onPlayerNameChange,
    onSubmitScore,
    onRestart,
    onEndless,
    leaderboard,
  } = props;
  const isVictory = variant === "victory";
  return (
    <div
      className={`absolute inset-0 ${
        isVictory ? "bg-black/95" : "bg-black/90"
      } backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-slide-up overflow-y-auto`}
    >
      <h2
        className={`heading-hero mb-2 ${
          isVictory ? "text-yellow-500" : "text-red-500"
        }`}
      >
        {isVictory ? "ПОДРО ПОЧУВ" : "Кодло не вивезло"}
      </h2>
      <p className="text-on-primary-mute mb-4 max-w-md text-sm">
        {isVictory
          ? "Братва відбита! CodloHub survived another cringe incident. Ви можете грати нескінченно!"
          : "Братва прорвала оборону Кодлохабу. Подро мовчав занадто довго. Спробуйте іншу тактику!"}
      </p>
      <p className="text-yellow-400 font-bold text-lg mb-4">
        {isVictory
          ? `Фінальний Score: ${score}`
          : `Score: ${score} | Хвиль: ${wave - 1}`}
      </p>
      {sessionSummary && <SessionSummaryPanel summary={sessionSummary} />}
      {scoreSubmitted ? (
        <p className="text-green-400 text-sm mb-4">Збережено!</p>
      ) : (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Ваше ім'я"
            value={playerName}
            onChange={(e) => onPlayerNameChange(e.target.value)}
            maxLength={20}
            className="px-3 py-2 bg-zinc-900 border border-hairline-dark rounded text-on-primary text-sm w-40"
            onKeyDown={(e) => e.key === "Enter" && onSubmitScore()}
          />
          <button
            onClick={onSubmitScore}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-500 text-sm font-bold button-cap"
          >
            В лідерборд
          </button>
        </div>
      )}
      <LeaderboardPreview entries={leaderboard} />
      {isVictory ? (
        <div className="flex gap-4">
          {onEndless && (
            <button
              onClick={onEndless}
              className="px-6 py-3 bg-yellow-600 text-white rounded hover:bg-yellow-500 button-cap"
            >
              Нескінченна гра
            </button>
          )}
          <button
            onClick={onRestart}
            className="px-6 py-3 border border-hairline-dark rounded hover:bg-canvas-night-soft text-on-primary button-cap"
          >
            Почати знову
          </button>
        </div>
      ) : (
        <button onClick={onRestart} className="btn-ghost text-red-400 hover:text-white">
          Зіграти ще раз
        </button>
      )}
    </div>
  );
}
