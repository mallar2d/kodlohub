/**
 * Upgrade panel — the right-rail card that opens when a placed tower is
 * selected. Shows the tower's stats, the three upgrade paths, and the
 * targeting / priority controls.
 *
 * Extracted from BratTDClient.tsx (Task 12).
 */

import React from "react";
import { ANTI_AIR_TOWERS, TOWER_CONFIGS, TIER_UNLOCK_COSTS } from "@/app/(main)/tools/brat-td/gameConfig";
import { formatStat, getEffectiveTowerDamage, getEffectiveTowerRange, getExpectedDps, getUpgradePreview, isSupportTowerType } from "@/lib/brat-td/pure";
import { checkUpgradeAllowed } from "@/lib/brat-td/pure";
import {
  hasT5ForTowerPath,
  isTierUnlocked,
  unlockTierForTower,
  type ProgressionActionsConfig,
} from "@/lib/brat-td/progression-actions";
import { computeSellPrice } from "@/lib/brat-td/tower-actions";
import type { PlacedTower, ProgressionState, Upgrade } from "@/lib/brat-td/types";

export interface UpgradePanelProps {
  tower: PlacedTower;
  gold: number;
  gameStatus: "idle" | "playing" | "gameover" | "victory";
  progression: ProgressionState;
  ctx: Pick<ProgressionActionsConfig, "towersRef" | "progressionRef" | "pushLog" | "PROGRESSION_CONFIG" | "setProgression">;
  onSell: () => void;
  onClose: () => void;
  onBuyUpgrade: (pathIndex: number) => void;
  onChangeTargeting: (mode: "first" | "last" | "strongest" | "nearest") => void;
  onTogglePrioritizeCamo: () => void;
  onTogglePrioritizeDrones: () => void;
}

const TARGETING_LABELS: Record<"first" | "last" | "strongest" | "nearest", string> = {
  first: "Перший",
  last: "Останній",
  strongest: "Найсильніший",
  nearest: "Найближчий",
};

export function UpgradePanel(props: UpgradePanelProps) {
  const {
    tower,
    gold,
    gameStatus,
    progression,
    ctx,
    onSell,
    onClose,
    onBuyUpgrade,
    onChangeTargeting,
    onTogglePrioritizeCamo,
    onTogglePrioritizeDrones,
  } = props;
  const sellPrice = computeSellPrice(tower);

  return (
    <div className="card-dark p-4 border-hairline-dark bg-canvas-night-soft animate-slide-up">
      <div className="flex items-center justify-between border-b border-hairline-dark pb-3 mb-3">
        <div className="flex-1 min-w-0 mr-4">
          <h3 className="font-bold text-on-primary flex items-center gap-2 button-cap">
            <span
              className="h-3 w-3 rounded-sm border border-white/20"
              style={{ backgroundColor: tower.color }}
            />
            {tower.name}
          </h3>
          <p className="text-xs text-ink-mute mt-0.5">
            Рівень: {tower.level} | Убивств: {tower.totalKills}
          </p>
          <p className="text-[10px] text-cyan-300 mt-0.5">
            Mastery XP: {Math.floor(progression.towerMastery[tower.type]?.towerXp ?? 0)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onSell}
            className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 rounded text-xs micro-cap transition-colors"
          >
            Продати: +{sellPrice} ☕
          </button>
          <button
            onClick={onClose}
            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-hairline-dark text-on-primary rounded text-xs font-semibold transition-colors"
            title="Назад до магазину"
            aria-label="Закрити панель налаштувань башти"
          >
            ✕
          </button>
        </div>
      </div>

      {!isSupportTowerType(tower.type) && (
        <div className="flex flex-col gap-2 mb-4 border-b border-hairline-dark pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-mute font-semibold">Ціль:</span>
            <div className="flex flex-wrap gap-1">
              {(["first", "last", "strongest", "nearest"] as const).map((mode) => {
                const isActive = (tower.targetingMode || "first") === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => onChangeTargeting(mode)}
                    className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                      isActive
                        ? "border-cyan-500 text-cyan-400 bg-cyan-950/50"
                        : "border-hairline-dark text-ink-mute hover:text-on-primary bg-black/20"
                    }`}
                  >
                    {TARGETING_LABELS[mode]}
                  </button>
                );
              })}
            </div>
          </div>
          <PriorityRow
            tower={tower}
            onTogglePrioritizeCamo={onTogglePrioritizeCamo}
            onTogglePrioritizeDrones={onTogglePrioritizeDrones}
          />
        </div>
      )}

      {isSupportTowerType(tower.type) ? (
        <SupportTowerStats tower={tower} />
      ) : (
        <DamageTowerStats tower={tower} />
      )}

      <p className="micro-cap text-ink-mute mb-2">ПРОКАЧКА ЮНІТА</p>
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((pathIndex) => (
          <UpgradePath
            key={pathIndex}
            tower={tower}
            pathIndex={pathIndex}
            gold={gold}
            gameStatus={gameStatus}
            progression={progression}
            ctx={ctx}
            onBuy={() => onBuyUpgrade(pathIndex)}
          onUnlock={() => unlockTierForTower(tower.type, pathIndex, getNextTier(tower, pathIndex), ctx)}
        />
        ))}
      </div>
    </div>
  );
}

function getNextTier(tower: PlacedTower, pathIndex: number): number {
  return pathIndex === 0
    ? tower.path1Tier + 1
    : pathIndex === 1
    ? tower.path2Tier + 1
    : tower.path3Tier + 1;
}

function getPathName(tower: PlacedTower, pathIndex: number): string {
  if (pathIndex === 0) {
    return tower.type === "bankomat" ? "Шлях 1: Економіка" : "Шлях 1: Руйнівна Сила";
  }
  if (pathIndex === 1) {
    return tower.type === "bankomat" ? "Шлях 2: Підсилення" : "Шлях 2: Швидкість Атаки";
  }
  return tower.type === "bankomat" ? "Шлях 3: Радар і MIB" : "Шлях 3: Особливі Ефекти";
}

function getPathUpgrades(tower: PlacedTower, pathIndex: number): Upgrade[] {
  const baseConfig = TOWER_CONFIGS[tower.type];
  if (pathIndex === 0) return baseConfig.upgrades.path1;
  if (pathIndex === 1) return baseConfig.upgrades.path2;
  return baseConfig.upgrades.path3;
}

function getCurrentTier(tower: PlacedTower, pathIndex: number): number {
  if (pathIndex === 0) return tower.path1Tier;
  if (pathIndex === 1) return tower.path2Tier;
  return tower.path3Tier;
}

function PriorityRow({
  tower,
  onTogglePrioritizeCamo,
  onTogglePrioritizeDrones,
}: {
  tower: PlacedTower;
  onTogglePrioritizeCamo: () => void;
  onTogglePrioritizeDrones: () => void;
}) {
  const isCamoCapable = tower.camoDetection || tower.hasCamoBuff;
  const isAirCapable = ANTI_AIR_TOWERS.has(tower.type);
  if (!isCamoCapable && !isAirCapable) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-ink-mute font-semibold">Пріоритет:</span>
      <div className="flex flex-wrap gap-1">
        {isCamoCapable && (
          <button
            onClick={onTogglePrioritizeCamo}
            className={`px-2 py-0.5 text-[10px] rounded border transition-colors flex items-center gap-1 ${
              tower.prioritizeCamo
                ? "border-amber-500 text-amber-400 bg-amber-950/50"
                : "border-hairline-dark text-ink-mute hover:text-on-primary bg-black/20"
            }`}
          >
            👁️ Камуфляж
          </button>
        )}
        {isAirCapable && (
          <button
            onClick={onTogglePrioritizeDrones}
            className={`px-2 py-0.5 text-[10px] rounded border transition-colors flex items-center gap-1 ${
              tower.prioritizeDrones
                ? "border-purple-500 text-purple-400 bg-purple-950/50"
                : "border-hairline-dark text-ink-mute hover:text-on-primary bg-black/20"
            }`}
          >
            🛸 Дрони
          </button>
        )}
      </div>
    </div>
  );
}

function SupportTowerStats({ tower }: { tower: PlacedTower }) {
  const speedBuff = tower.buffMultiplier || (tower.type === "coffee" ? 0.05 : 0);
  const rangeBuff = tower.rangeBuff || 0;
  const rangeBuffPercent = tower.rangeBuffPercent || 0;
  const armorPierce = tower.ignoreArmorBuff || 0;
  return (
    <div className="grid grid-cols-2 gap-2 text-[11px] bg-black/40 border border-hairline-dark/50 p-2.5 rounded mb-4">
      <div>
        <span className="text-ink-mute">Радіус аури:</span>{" "}
        <span className="text-on-primary font-semibold">{Math.round(tower.range)}px</span>
      </div>
      <div>
        <span className="text-ink-mute">Дохід:</span>{" "}
        <span className="text-yellow-400 font-semibold">
          +{tower.endOfWaveBonus || 0} / хвиля
        </span>
      </div>
      <div>
        <span className="text-ink-mute">Швидкість:</span>{" "}
        <span className="text-cyan-400 font-semibold">+{Math.round(speedBuff * 100)}%</span>
      </div>
      <div>
        <span className="text-ink-mute">Шкода:</span>{" "}
        <span className="text-green-400 font-semibold">
          +{formatStat(tower.damageBuff || 0)}%
        </span>
      </div>
      <div>
        <span className="text-ink-mute">Дальність веж:</span>{" "}
        <span className="text-on-primary font-semibold">
          +{formatStat(rangeBuff)}px / +{Math.round(rangeBuffPercent * 100)}%
        </span>
      </div>
      <div>
        <span className="text-ink-mute">Пробиття броні:</span>{" "}
        <span className="text-amber-300 font-semibold">
          {Math.round(armorPierce * 100)}%
        </span>
      </div>
      <div className="col-span-2">
        <span className="text-ink-mute">Камуфляж аури:</span>{" "}
        <span
          className={
            tower.camoDetectionBuff
              ? "text-green-400 font-semibold animate-pulse"
              : "text-red-400 font-semibold"
          }
        >
          {tower.camoDetectionBuff ? "Дає вежам поруч" : "Ні"}
        </span>
      </div>
      <div className="col-span-2 text-[10px] text-ink-mute border-t border-hairline-dark/50 pt-1">
        Hotkeys: Q/W/E купують шлях 1/2/3. T: цикл режимів цілі. На мобілці вибір башти ставить паузу.
      </div>
    </div>
  );
}

function DamageTowerStats({ tower }: { tower: PlacedTower }) {
  const detectsCamo = tower.camoDetection || tower.hasCamoBuff;
  const isLeadImmune = tower.ignoresArmor || tower.type !== "hammer";
  const effectiveDamage = getEffectiveTowerDamage(tower);
  const effectiveRange = getEffectiveTowerRange(tower);
  const displayDamage = Math.round(effectiveDamage);
  const displayDamageBonus = Math.round(effectiveDamage - tower.damage);
  const dps = getExpectedDps({ ...tower, damage: effectiveDamage });
  return (
    <div className="grid grid-cols-2 gap-2 text-[11px] bg-black/40 border border-hairline-dark/50 p-2.5 rounded mb-4">
      <div>
        <span className="text-ink-mute">Шкода:</span>{" "}
        <span className="text-on-primary font-semibold">{displayDamage}</span>
        {displayDamageBonus !== 0 && (
          <span className="text-green-400"> (+{displayDamageBonus})</span>
        )}
      </div>
      <div>
        <span className="text-ink-mute">Дальність:</span>{" "}
        <span className="text-on-primary font-semibold">{Math.round(effectiveRange)}px</span>
      </div>
      <div>
        <span className="text-ink-mute">Пробиття (пірс):</span>{" "}
        <span className="text-on-primary font-semibold">{tower.pierce || 1}</span>
      </div>
      <div>
        <span className="text-ink-mute">DPS:</span>{" "}
        <span className="text-cyan-400 font-semibold">{dps.toFixed(1)}</span>
      </div>
      <div>
        <span className="text-ink-mute">Камуфляж:</span>{" "}
        <span
          className={
            detectsCamo
              ? "text-green-400 font-semibold animate-pulse"
              : "text-red-400 font-semibold"
          }
        >
          {detectsCamo ? "Виявляє" : "Ні"}
        </span>
      </div>
      <div className="col-span-2">
        <span className="text-ink-mute">Свинець:</span>{" "}
        <span
          className={
            isLeadImmune
              ? "text-green-400 font-semibold"
              : "text-amber-500 font-semibold"
          }
        >
          {isLeadImmune ? "Пробиває свинцеві" : "Не пробиває"}
        </span>
      </div>
      <div className="col-span-2 text-[10px] text-ink-mute border-t border-hairline-dark/50 pt-1">
        Hotkeys: Q/W/E купують шлях 1/2/3. T: цикл режимів цілі. На мобілці вибір башти ставить паузу.
      </div>
    </div>
  );
}

function UpgradePath({
  tower,
  pathIndex,
  gold,
  gameStatus,
  progression,
  ctx,
  onBuy,
  onUnlock,
}: {
  tower: PlacedTower;
  pathIndex: number;
  gold: number;
  gameStatus: "idle" | "playing" | "gameover" | "victory";
  progression: ProgressionState;
  ctx: Pick<ProgressionActionsConfig, "towersRef" | "progressionRef" | "pushLog" | "PROGRESSION_CONFIG" | "setProgression">;
  onBuy: () => void;
  onUnlock: () => void;
}) {
  const pathName = getPathName(tower, pathIndex);
  const currentTier = getCurrentTier(tower, pathIndex);
  const pathUpgrades = getPathUpgrades(tower, pathIndex);
  const isLocked = !checkUpgradeAllowed(
    tower.path1Tier,
    tower.path2Tier,
    tower.path3Tier,
    pathIndex
  );
  const nextUpgrade = currentTier < 5 ? pathUpgrades[currentTier] : null;
  const canAfford = nextUpgrade ? gold >= nextUpgrade.cost : false;
  const nextTier = currentTier + 1;
  const tierUnlocked = nextUpgrade
    ? isTierUnlocked(tower.type, pathIndex, nextTier, progression)
    : true;
  const unlockCost = TIER_UNLOCK_COSTS[nextTier];
  const masteryXp = progression.towerMastery[tower.type]?.towerXp ?? 0;
  const canUnlockTier = Boolean(
    unlockCost && masteryXp >= unlockCost && (nextTier !== 5 || progression.playerLevel >= 25)
  );
  const t5PathTaken = hasT5ForTowerPath(tower.type, pathIndex, tower.id, ctx);

  return (
    <div
      key={pathIndex}
      className="border border-hairline-dark/60 rounded p-2.5 bg-canvas-night bg-opacity-40"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-on-primary-mute uppercase tracking-wider micro-cap">
          {pathName}
        </span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((tier) => (
            <div
              key={tier}
              className={`w-2 h-2 rounded-full border ${
                tier <= currentTier
                  ? "bg-cyan-500 border-cyan-400 shadow shadow-cyan-500"
                  : "bg-black/40 border-hairline-dark"
              }`}
            />
          ))}
        </div>
      </div>

      {nextUpgrade ? (
        isLocked ? (
          <div className="p-2 border border-dashed border-red-950/50 bg-red-950/10 text-red-400 rounded text-center text-xs micro-cap">
            ЗАБЛОКОВАНО CROSSPATH
          </div>
        ) : !tierUnlocked ? (
          <button
            disabled={!canUnlockTier}
            onClick={onUnlock}
            className={`w-full p-2.5 border rounded text-left transition-all ${
              canUnlockTier
                ? "border-cyan-700 bg-cyan-950/20 hover:border-cyan-400"
                : "border-hairline-dark/40 opacity-60 cursor-not-allowed"
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-semibold text-xs text-cyan-200">
                Відкрити T{nextTier}
              </span>
              <span className="text-xs font-semibold text-cyan-400">XP {unlockCost}</span>
            </div>
            <p className="text-[11px] text-on-primary-mute leading-relaxed">
              {nextTier === 5 && progression.playerLevel < 25
                ? "Потрібен рівень гравця 25."
                : `Потрібно XP цієї вежі. Є ${Math.floor(masteryXp)}.`}
            </p>
          </button>
        ) : t5PathTaken ? (
          <div className="p-2 border border-dashed border-yellow-950/70 bg-yellow-950/10 text-yellow-300 rounded text-center text-xs micro-cap">
            T5 цього шляху вже стоїть
          </div>
        ) : (
          <button
            disabled={!canAfford || gameStatus !== "playing"}
            onClick={onBuy}
            className={`w-full p-2.5 border rounded text-left transition-all ${
              canAfford
                ? "border-hairline-dark hover:border-on-primary-mute hover:bg-canvas-night hover:bg-opacity-80"
                : "border-hairline-dark/40 opacity-50 cursor-not-allowed"
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-semibold text-xs text-on-primary">
                {nextUpgrade.name} (T{currentTier + 1})
              </span>
              <span className="text-xs font-semibold text-yellow-500 font-[var(--font-display)]">
                ☕ {nextUpgrade.cost}
              </span>
            </div>
            <p className="text-[11px] text-on-primary-mute leading-relaxed">
              {nextUpgrade.description}
            </p>
            <p className="mt-1 text-[10px] text-cyan-300/80 leading-tight">
              {getUpgradePreview(tower, nextUpgrade)}
            </p>
          </button>
        )
      ) : (
        <div className="p-2 border border-green-950/40 bg-green-950/10 text-green-400 rounded text-center text-xs micro-cap">
          МАКСИМУМ (Tier 5)
        </div>
      )}
    </div>
  );
}
