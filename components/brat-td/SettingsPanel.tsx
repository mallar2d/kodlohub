/**
 * Settings panel — volume slider + screen shake / particles / effect-limits
 * toggles.
 *
 * Extracted from BratTDClient.tsx (Task 12).
 */

import React from "react";
import type { GameSettings } from "@/lib/brat-td/state";

export interface SettingsPanelProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <div className="card-dark p-4 border-hairline-dark">
      <p className="micro-cap text-ink-mute mb-3">НАЛАШТУВАННЯ</p>
      <VolumeSlider
        label="Загальна гучність"
        value={settings.volume}
        onChange={(v) => onChange({ ...settings, volume: v })}
      />
      <VolumeSlider
        label="Звукові ефекти"
        value={settings.sfxVolume}
        onChange={(v) => onChange({ ...settings, sfxVolume: v })}
      />
      <VolumeSlider
        label="Інтерфейс"
        value={settings.uiVolume}
        onChange={(v) => onChange({ ...settings, uiVolume: v })}
      />
      <Toggle
        label="Screen shake"
        value={settings.screenShake}
        onChange={(v) => onChange({ ...settings, screenShake: v })}
      />
      <Toggle
        label="Частинки / вибухи"
        value={settings.particles}
        onChange={(v) => onChange({ ...settings, particles: v })}
      />
      <Toggle
        label="Обмеження ефектів"
        value={settings.effectLimits}
        onChange={(v) => onChange({ ...settings, effectLimits: v })}
        className="mt-2"
      />
    </div>
  );
}

function VolumeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-xs text-on-primary-mute mb-3">
      {label}: {Math.round(value * 100)}%
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-1"
      />
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <label className={`flex items-center gap-2 text-xs text-on-primary-mute ${className}`}>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
