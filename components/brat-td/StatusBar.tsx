/**
 * StatusBar — the small pulsing line at the bottom of the canvas that
 * shows the most recent status message ("Подро почув накати братви…").
 *
 * Extracted from BratTDClient.tsx (Task 12).
 */

import React from "react";

export interface StatusBarProps {
  message: string;
}

export function StatusBar({ message }: StatusBarProps) {
  return (
    <div className="card-dark p-3 text-sm border-hairline-dark flex items-center gap-3 bg-canvas-night-soft text-cyan-400 font-mono" aria-live="polite" role="status">
      <span className="animate-pulse text-xs" aria-hidden="true">●</span>
      <span>{message}</span>
    </div>
  );
}
