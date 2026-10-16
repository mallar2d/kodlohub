"use client";

import type { PublishedResult } from "@/lib/kodlobench/types";
import { entryLabel } from "@/lib/kodlobench/format";
import { MAX_SELECTED } from "@/lib/kodlobench/view";
import { familyColor } from "./palette";

interface Props {
  slots: (string | null)[];
  byId: Map<string, PublishedResult>;
  hoverId: string | null;
  full: boolean;
  onToggle: (id: string) => void;
  onClear: () => void;
  onHover: (id: string | null) => void;
}

/** Legend for the compared entries: colour swatch + number (never colour alone) + name. */
export default function SelectionTray({ slots, byId, hoverId, full, onToggle, onClear, onHover }: Props) {
  const entries = slots
    .map((id, slot) => (id ? { id, slot, r: byId.get(id) } : null))
    .filter((e): e is { id: string; slot: number; r: PublishedResult } => !!e && !!e.r);

  if (entries.length === 0) {
    return (
      <p className="text-xs text-ink-mute px-1">
        Відмічай записи в таблиці або на графіках, щоб порівняти до {MAX_SELECTED} одночасно.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Обрані для порівняння">
      <span className="micro-cap text-ink-mute mr-1">
        ОБРАНО {entries.length}/{MAX_SELECTED}
      </span>
      {entries.map(({ id, slot, r }) => (
        <span
          key={id}
          onMouseEnter={() => onHover(id)}
          onMouseLeave={() => onHover(null)}
          className={`inline-flex items-center gap-2 rounded-full border pl-2.5 pr-1 py-1 text-xs text-on-primary max-w-full ${
            hoverId === id ? "border-on-primary" : "border-hairline-dark"
          }`}
        >
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold shrink-0"
            style={{ background: familyColor(r.model), color: "var(--canvas-night)" }}
            aria-hidden="true"
          >
            {slot + 1}
          </span>
          <span className="truncate max-w-[16rem]" title={entryLabel(r)}>
            {entryLabel(r)}
          </span>
          <button
            type="button"
            onClick={() => onToggle(id)}
            aria-label={`Прибрати з порівняння: ${entryLabel(r)}`}
            className="w-5 h-5 rounded-full inline-flex items-center justify-center text-ink-mute hover:text-on-primary hover:bg-white/10 cursor-pointer"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ink-mute hover:text-on-primary cursor-pointer"
      >
        Очистити
      </button>
      {full && (
        <span role="alert" className="text-xs text-on-primary-mute">
          Максимум {MAX_SELECTED} записів. Прибери один, щоб додати інший.
        </span>
      )}
    </div>
  );
}
