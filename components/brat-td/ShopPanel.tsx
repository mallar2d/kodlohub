/**
 * Shop panel — lists all towers the player can buy, shows their info tooltip,
 * supports drag-and-drop, click-to-select, and disabled state when the
 * player level is too low or gold is insufficient.
 *
 * Extracted from BratTDClient.tsx (Task 12).
 */

import React from "react";
import { TOWER_CONFIGS, TOWER_UNLOCK_LEVELS } from "@/app/(main)/tools/brat-td/gameConfig";
import type { ProgressionState } from "@/lib/brat-td/types";
import { isTowerUnlocked } from "@/lib/brat-td/progression-actions";

export interface ShopPanelProps {
  gold: number;
  gameStatus: "idle" | "playing" | "gameover" | "victory";
  selectedShopTower: string | null;
  progression: ProgressionState;
  isSandbox?: boolean;
  onSelect: (type: string | null) => void;
  onDragStart: (type: string) => void;
  onDragEnd: () => void;
  onMouseEnter: (type: string) => void;
  onMouseLeave: () => void;
  setSelectedPlacedTowerId: (id: string | null) => void;
  setSelectedTower: (value: unknown) => void;
  pushLog: (msg: string) => void;
}

export function ShopPanel(props: ShopPanelProps) {
  const {
    gold,
    gameStatus,
    selectedShopTower,
    progression,
    isSandbox,
    onSelect,
    onDragStart,
    onDragEnd,
    onMouseEnter,
    onMouseLeave,
    setSelectedPlacedTowerId,
    setSelectedTower,
    pushLog,
  } = props;

  return (
    <div className="card-dark p-4 border-hairline-dark">
      <p className="micro-cap text-ink-mute mb-3">МАГАЗИН ПОДРО-ЮНІТІВ</p>
      <div className="flex flex-col gap-1.5">
        {Object.entries(TOWER_CONFIGS)
          .sort(
            (a, b) =>
              (TOWER_UNLOCK_LEVELS[a[0]] ?? 0) - (TOWER_UNLOCK_LEVELS[b[0]] ?? 0)
          )
          .map(([type, config]) => {
            const canAfford = isSandbox || gold >= config.cost;
            const towerUnlocked = isSandbox || isTowerUnlocked(type, progression);
            const neededLevel = TOWER_UNLOCK_LEVELS[type] ?? 1;
            const isSelected = selectedShopTower === type;
            return (
              <div key={type} className="relative group">
                <button
                  disabled={gameStatus !== "playing" || !towerUnlocked}
                  draggable={gameStatus === "playing" && canAfford && towerUnlocked}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", type);
                    e.dataTransfer.effectAllowed = "copy";
                    onDragStart(type);
                    setSelectedPlacedTowerId(null);
                    setSelectedTower(null);
                  }}
                  onDragEnd={onDragEnd}
                  onMouseEnter={() => onMouseEnter(type)}
                  onMouseLeave={onMouseLeave}
                  onClick={() => {
                    if (!towerUnlocked) {
                      pushLog(`${config.name} відкривається на рівні ${neededLevel}.`);
                      return;
                    }
                    onSelect(isSelected ? null : type);
                    setSelectedPlacedTowerId(null);
                    setSelectedTower(null);
                  }}
                  className={`w-full px-3 py-2 border rounded text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? "border-white bg-zinc-900 shadow-md shadow-white/5 cursor-grab"
                      : canAfford && towerUnlocked
                      ? "border-hairline-dark hover:border-on-primary-mute hover:bg-canvas-night-soft cursor-grab"
                      : "border-hairline-dark/40 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span
                      className="h-3.5 w-3.5 rounded-sm border border-white/20"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="font-semibold text-on-primary">
                      {config.name}
                    </span>
                  </span>
                  <span className="text-xs font-bold font-[var(--font-display)] text-yellow-500">
                    {isSandbox ? "FREE" : towerUnlocked ? `GOLD ${config.cost}` : `LVL ${neededLevel}`}
                  </span>
                </button>
                <div className="absolute z-50 left-0 right-0 bottom-full mb-1 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <div className="bg-zinc-900 border border-hairline-dark rounded p-3 shadow-xl text-xs">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="h-3.5 w-3.5 rounded-sm border border-white/20"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className="font-bold text-on-primary text-sm">
                        {config.name}
                      </span>
                      <span className="text-yellow-500 font-bold">
                        GOLD {config.cost}
                      </span>
                    </div>
                    <p className="text-on-primary-mute mb-2 leading-relaxed">
                      {config.description}
                    </p>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      {config.damage > 0 && (
                        <div>
                          <span className="text-ink-mute">Шкода:</span>{" "}
                          <span className="text-on-primary font-semibold">
                            {config.damage}
                          </span>
                        </div>
                      )}
                      {config.fireRate > 0 && (
                        <div>
                          <span className="text-ink-mute">Швидкість:</span>{" "}
                          <span className="text-on-primary font-semibold">
                            {config.fireRate}с
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-ink-mute">Дальність:</span>{" "}
                        <span className="text-on-primary font-semibold">
                          {config.range}px
                        </span>
                      </div>
                      {config.pierce && config.pierce > 1 && (
                        <div>
                          <span className="text-ink-mute">Пірс:</span>{" "}
                          <span className="text-on-primary font-semibold">
                            {config.pierce}
                          </span>
                        </div>
                      )}
                      {config.camoDetection && (
                        <div className="col-span-2">
                          <span className="text-green-400">Виявляє камуфляж</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
      <div className="mt-3 p-2 border border-hairline-dark border-dashed rounded text-center text-ink-mute text-[11px] bg-black/20">
        Наведіть для інфо · Клік для вибору · Drag-and-drop для будівництва
      </div>
    </div>
  );
}
