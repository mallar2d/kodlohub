/**
 * Idle overlay — the pre-game start screen with map/difficulty selector
 * and tutorial hint.
 *
 * Extracted from BratTDClient.tsx (Task 12).
 */

import React from "react";
import { MapSelector } from "@/components/brat-td/MapSelector";
import type { DifficultyKey, ProgressionState } from "@/lib/brat-td/types";

export interface IdleOverlayProps {
  selectedMapId: string;
  onSelectMap: (id: string) => void;
  difficulty: DifficultyKey;
  onSelectDifficulty: (key: DifficultyKey) => void;
  progression: ProgressionState;
  onStartGame: () => void;
}

export function IdleOverlay(props: IdleOverlayProps) {
  const {
    selectedMapId,
    onSelectMap,
    difficulty,
    onSelectDifficulty,
    progression,
    onStartGame,
  } = props;
  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center">
      <h2 className="heading-section text-on-primary mb-4">BRAT TD</h2>
      <p className="text-on-primary-mute mb-6 max-w-md text-sm">
        Захистіть Кодлохаб від хвиль Братви. Ставте Подро-юнітів, які кидатимуть молотки,
        каву та святих рачків.
      </p>
      <MapSelector
        selectedMapId={selectedMapId}
        onSelectMap={onSelectMap}
        difficulty={difficulty}
        onSelectDifficulty={onSelectDifficulty}
        progression={progression}
      />
      <div className="mb-5 max-w-md text-left bg-zinc-950/70 border border-hairline-dark rounded p-3 text-[11px] text-on-primary-mute leading-relaxed">
        <p className="micro-cap text-cyan-400 mb-1">ШВИДКИЙ ТУТОРІАЛ</p>
        <p>
          1-0: вибір башт. Q/W/E: апгрейди вибраної башти. Space: старт хвилі. Delete/X: продаж. P: пауза. T: цикл режимів цілі. ESC: скасувати.
        </p>
        <p>
          Свинець не любить газ/Infinix/Candy/бронебійне. Камо треба бачити. Після 46 є 10 handcrafted post-game хвиль.
        </p>
      </div>
      <button onClick={onStartGame} className="btn-ghost text-cyan-400 hover:text-white mb-6">
        ПРИЙНЯТИ НАКАТ
      </button>
    </div>
  );
}
