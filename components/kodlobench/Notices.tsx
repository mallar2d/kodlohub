"use client";

import type { ReactNode } from "react";

export function EmptyNotice({ title, caption, children }: { title: string; caption?: string; children?: ReactNode }) {
  return (
    <div className="card-dark p-8 sm:p-12 text-center" role="status">
      <p className="text-lg sm:text-xl font-semibold text-on-primary">{title}</p>
      {caption && <p className="mt-3 text-sm text-on-primary-mute max-w-2xl mx-auto">{caption}</p>}
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

const ALERT_PATH = (
  <>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </>
);

/** Warning icon for an owner-supplied note about how to read a result. */
export function AlertIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {ALERT_PATH}
    </svg>
  );
}

/** Inline marker next to a score; the warning text is in the tooltip and in the details dialog. */
export function AlertMark({ text }: { text: string }) {
  return (
    <span
      className="inline-flex align-middle ml-1.5 text-on-primary cursor-help"
      title={text}
      role="img"
      aria-label={`Застереження: ${text}`}
    >
      <AlertIcon />
    </span>
  );
}
