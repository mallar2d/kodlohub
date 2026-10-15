"use client";

import type { ReactNode } from "react";

export function EmptyNotice({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card-dark p-8 sm:p-12 text-center" role="status">
      <p className="micro-cap text-ink-mute mb-3">НЕМАЄ ДАНИХ</p>
      <p className="text-lg sm:text-xl font-semibold text-on-primary">{title}</p>
      {children && <div className="mt-3 text-sm text-on-primary-mute max-w-xl mx-auto">{children}</div>}
    </div>
  );
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card-dark p-8 sm:p-12 text-center" role="alert">
      <p className="micro-cap text-ink-mute mb-3">ПОМИЛКА</p>
      <p className="text-lg font-semibold text-on-primary mb-2">{message}</p>
      <p className="text-sm text-on-primary-mute mb-6">Спробуй ще раз трохи згодом.</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost text-on-primary">
          СПРОБУВАТИ ЗНОВУ
        </button>
      )}
    </div>
  );
}

export function ChartSkeleton({ height = 360 }: { height?: number }) {
  return (
    <div
      className="animate-shimmer bg-gradient-to-r from-canvas-night-soft via-hairline-dark/30 to-canvas-night-soft bg-[length:200%_100%] rounded-lg"
      style={{ height }}
      role="status"
      aria-label="Завантаження графіка"
    />
  );
}

export function NoDataText({ className = "" }: { className?: string }) {
  return <span className={`text-ink-mute text-xs italic whitespace-nowrap ${className}`}>Немає даних</span>;
}
