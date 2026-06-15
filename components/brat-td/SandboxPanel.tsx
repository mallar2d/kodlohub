"use client";

import React, { useState, useMemo } from "react";
import {
  ENEMY_CONFIGS,
  ENEMY_TYPE_KEYS,
  EMOJI_MAP,
  getEnemyStatsForWave,
} from "@/app/(main)/tools/brat-td/gameConfig";
import { getMapById, getWaveRouteIds } from "@/lib/brat-td/maps";
import type { EnemyModifier } from "@/lib/brat-td/types";

export interface SandboxPanelProps {
  wave: number;
  selectedMapId: string;
  isWaveActive: boolean;
  onSpawnEnemy: (type: string, tier: number, modifiers: EnemyModifier[], count: number, routeId?: string) => void;
  onSetWave: (wave: number) => void;
  onStartWave: () => void;
  onClearAllEnemies: () => void;
  onInstantWaveClear: () => void;
  onSetGold: (amount: number) => void;
  onSetLives: (amount: number) => void;
}

const MODIFIER_OPTIONS: { key: EnemyModifier; label: string; emoji: string }[] = [
  { key: "camo", label: "Camo", emoji: "🦹" },
  { key: "regen", label: "Regen", emoji: "💗" },
  { key: "lead", label: "Lead", emoji: "🔩" },
  { key: "phantom", label: "Phantom", emoji: "👻" },
  { key: "ceramic", label: "Ceramic", emoji: "🏺" },
];

const TIER_LABELS = [
  "T1 Base", "T2 Tough", "T3 Elite", "T4 Champion",
  "T5 Legend", "T6 Brutal", "T7 Nightmare", "T8 Apocalypse",
];

const TIER_TO_WAVE = [1, 11, 21, 31, 41, 47, 57, 67];

const SPAWN_PRESETS = [1, 5, 10, 25, 50];

export function SandboxPanel(props: SandboxPanelProps) {
  const {
    wave,
    selectedMapId,
    isWaveActive,
    onSpawnEnemy,
    onSetWave,
    onStartWave,
    onClearAllEnemies,
    onInstantWaveClear,
    onSetGold,
    onSetLives,
  } = props;

  const [collapsed, setCollapsed] = useState(false);
  const [selectedEnemy, setSelectedEnemy] = useState("ordinary");
  const [enemyTier, setEnemyTier] = useState(1);
  const [enemyModifiers, setEnemyModifiers] = useState<EnemyModifier[]>([]);
  const [spawnCount, setSpawnCount] = useState(10);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [jumpWave, setJumpWave] = useState(1);
  const [customGold, setCustomGold] = useState("999999");
  const [customLives, setCustomLives] = useState("999999");

  const activeMap = useMemo(() => getMapById(selectedMapId), [selectedMapId]);
  const routes = activeMap.routes;
  const waveRoutes = useMemo(() => getWaveRouteIds(activeMap, wave), [activeMap, wave]);

  const previewStats = useMemo(() => {
    const tierWave = TIER_TO_WAVE[Math.min(Math.max(enemyTier - 1, 0), 7)];
    return getEnemyStatsForWave(selectedEnemy, tierWave, enemyModifiers.length > 0 ? enemyModifiers : undefined);
  }, [selectedEnemy, enemyTier, enemyModifiers]);

  const toggleModifier = (mod: EnemyModifier) => {
    setEnemyModifiers((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const handleSpawn = () => {
    onSpawnEnemy(selectedEnemy, enemyTier, enemyModifiers, spawnCount, selectedRouteId || undefined);
  };

  const handleJumpWave = () => {
    const w = Math.max(1, Math.min(999, jumpWave));
    onSetWave(w);
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-full p-2 rounded border border-amber-900/50 bg-amber-950/20 text-amber-300 text-xs font-bold micro-cap hover:bg-amber-950/40 transition-colors"
      >
        🏖️ SANDBOX CONTROLS — Розгорнути
      </button>
    );
  }

  return (
    <div className="card-dark border border-amber-900/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="micro-cap text-amber-300 flex items-center gap-2">
          🏖️ SANDBOX CONTROLS
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-[10px] text-ink-mute hover:text-on-primary transition-colors"
        >
          Згорнути ▲
        </button>
      </div>

      {/* Wave Controls */}
      <Section title="ХВИЛЯ">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[10px] text-ink-mute uppercase tracking-wider">Стрибнути:</label>
          <input
            type="number"
            min={1}
            max={999}
            value={jumpWave}
            onChange={(e) => setJumpWave(parseInt(e.target.value) || 1)}
            className="w-16 bg-zinc-900 border border-hairline-dark rounded px-2 py-1 text-xs text-on-primary font-mono"
          />
          <button onClick={handleJumpWave} className="px-3 py-1 border border-hairline-dark rounded hover:bg-canvas-night-soft text-xs font-bold micro-cap">
            Перейти
          </button>
          <span className="text-[10px] text-ink-mute ml-2">Поточна: {wave}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <button
            onClick={onStartWave}
            disabled={isWaveActive}
            className="px-4 py-1.5 bg-cyan-600 text-white rounded hover:bg-cyan-500 text-xs font-bold button-cap disabled:opacity-40"
          >
            Почати накат
          </button>
          <button onClick={onInstantWaveClear} className="px-3 py-1.5 border border-red-800 text-red-300 rounded hover:bg-red-950/40 text-xs font-bold micro-cap">
            Миттєва перемога
          </button>
          <button onClick={onClearAllEnemies} className="px-3 py-1.5 border border-hairline-dark rounded hover:bg-canvas-night-soft text-xs font-bold micro-cap">
            Очистити ворогів
          </button>
        </div>
      </Section>

      {/* Enemy Spawner */}
      <Section title="СПАВН ВОРОГІВ">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] text-ink-mute uppercase tracking-wider block mb-1">Тип</label>
            <select
              value={selectedEnemy}
              onChange={(e) => setSelectedEnemy(e.target.value)}
              className="w-full bg-zinc-900 border border-hairline-dark rounded px-2 py-1.5 text-xs text-on-primary"
            >
              {ENEMY_TYPE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {EMOJI_MAP[key] || "😐"} {ENEMY_CONFIGS[key].name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-ink-mute uppercase tracking-wider block mb-1">Тір ({enemyTier})</label>
            <input
              type="range"
              min={1}
              max={8}
              value={enemyTier}
              onChange={(e) => setEnemyTier(parseInt(e.target.value))}
              className="w-full accent-amber-400"
            />
            <span className="text-[9px] text-ink-mute">{TIER_LABELS[enemyTier - 1]}</span>
          </div>
          <div>
            <label className="text-[10px] text-ink-mute uppercase tracking-wider block mb-1">Кількість</label>
            <input
              type="number"
              min={1}
              max={200}
              value={spawnCount}
              onChange={(e) => setSpawnCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-zinc-900 border border-hairline-dark rounded px-2 py-1.5 text-xs text-on-primary font-mono"
            />
            <div className="flex gap-1 mt-1">
              {SPAWN_PRESETS.map((n) => (
                <button
                  key={n}
                  onClick={() => setSpawnCount(n)}
                  className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                    spawnCount === n
                      ? "border-amber-500 bg-amber-950/50 text-amber-300"
                      : "border-hairline-dark text-ink-mute hover:text-on-primary"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-ink-mute uppercase tracking-wider block mb-1">Маршрут</label>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full bg-zinc-900 border border-hairline-dark rounded px-2 py-1.5 text-xs text-on-primary"
            >
              <option value="">Авто ({waveRoutes.join(", ")})</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Modifiers */}
        <div className="mt-2">
          <label className="text-[10px] text-ink-mute uppercase tracking-wider block mb-1">Модифікатори</label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {MODIFIER_OPTIONS.map((mod) => (
              <button
                key={mod.key}
                onClick={() => toggleModifier(mod.key)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  enemyModifiers.includes(mod.key)
                    ? "border-amber-500 bg-amber-950/50 text-amber-300"
                    : "border-hairline-dark text-ink-mute hover:text-on-primary"
                }`}
              >
                {mod.emoji} {mod.label}
              </button>
            ))}
            {enemyModifiers.length > 0 && (
              <button
                onClick={() => setEnemyModifiers([])}
                className="text-[9px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-800 transition-colors"
              >
                Очистити
              </button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="mt-2 p-2 rounded bg-zinc-950/70 border border-hairline-dark">
          <span className="text-[9px] text-ink-mute block mb-1 uppercase tracking-wider">ПРЕРЕДПЕРЕГЛЯД (Tier {enemyTier})</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono">
            <span className="text-green-400">HP: {Math.round(previewStats.hp)}</span>
            <span className="text-cyan-400">SPD: {previewStats.speed.toFixed(2)}</span>
            <span className="text-red-400">DMG: {previewStats.damage}</span>
            <span className="text-yellow-400">☕: {previewStats.reward}</span>
            {previewStats.isArmored && <span className="text-blue-400">Броня</span>}
            {previewStats.isSuperArmored && <span className="text-blue-300">Супер-броня</span>}
            {previewStats.isCamo && <span className="text-green-700">Камо</span>}
            {previewStats.isRegen && <span className="text-pink-400">Реген</span>}
            {previewStats.isLead && <span className="text-gray-400">Свинець</span>}
          </div>
        </div>

        <button
          onClick={handleSpawn}
          className="w-full mt-2 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-500 text-xs font-bold button-cap"
        >
          СПАВНИТИ {spawnCount}× {EMOJI_MAP[selectedEnemy] || "😐"} {ENEMY_CONFIGS[selectedEnemy]?.name}
        </button>
      </Section>

      {/* Quick Actions */}
      <Section title="РЕСУРСИ">
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <label className="text-[10px] text-ink-mute uppercase tracking-wider">Gold:</label>
            <input
              type="number"
              value={customGold}
              onChange={(e) => setCustomGold(e.target.value)}
              className="w-24 bg-zinc-900 border border-hairline-dark rounded px-2 py-1 text-xs text-on-primary font-mono"
            />
            <button onClick={() => onSetGold(parseInt(customGold) || 999999)} className="px-3 py-1 border border-hairline-dark rounded hover:bg-canvas-night-soft text-xs font-bold micro-cap">
              Встановити
            </button>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-[10px] text-ink-mute uppercase tracking-wider">Lives:</label>
            <input
              type="number"
              value={customLives}
              onChange={(e) => setCustomLives(e.target.value)}
              className="w-24 bg-zinc-900 border border-hairline-dark rounded px-2 py-1 text-xs text-on-primary font-mono"
            />
            <button onClick={() => onSetLives(parseInt(customLives) || 999999)} className="px-3 py-1 border border-hairline-dark rounded hover:bg-canvas-night-soft text-xs font-bold micro-cap">
              Встановити
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="micro-cap text-amber-400/70 mb-1.5">{title}</h3>
      {children}
    </div>
  );
}
