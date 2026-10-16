"use client";

import { useMemo } from "react";
import type { PublishedResult } from "@/lib/kodlobench/types";
import { entryLabel, FAILED, NO_DATA, scoreText } from "@/lib/kodlobench/format";
import { scoreMaxFor } from "@/lib/kodlobench/categories";
import { slotOf, sortResults } from "@/lib/kodlobench/view";
import { AlertMark } from "./Notices";
import { familyColor } from "./palette";

interface Props {
  rows: PublishedResult[];
  slots: (string | null)[];
  hoverId: string | null;
  onHover: (id: string | null) => void;
  onToggle: (id: string) => void;
}

/**
 * Score comparison as plain HTML rows: every bar is a real button, so it is keyboard-operable,
 * readable on a phone and shares the same selection and highlight state as the table.
 * A missing score gets a hatched empty track labelled "Немає даних"; a real 0 gets a visible zero tick.
 */
export default function ScoreBars({ rows, slots, hoverId, onHover, onToggle }: Props) {
  const sorted = useMemo(() => sortResults(rows, "score", "desc"), [rows]);
  const hasSelection = slots.some(Boolean);

  const { min, span } = useMemo(() => {
    const vals = rows.map((r) => r.score).filter((v): v is number => v !== null);
    const lo = Math.min(0, ...vals);
    // Bars are measured against the known maximum, unless a published value exceeds it.
    const hi = Math.max(rows[0] ? scoreMaxFor(rows[0].category) : 0, ...vals);
    return { min: lo, span: hi - lo || 1 };
  }, [rows]);
  const zeroPct = (-min / span) * 100;

  return (
    <ul className="max-h-[560px] overflow-y-auto pr-1 space-y-1" aria-label="Порівняння балів">
      {sorted.map((r) => {
        const slot = slotOf(slots, r.id);
        const selected = slot !== -1;
        const hot = hoverId === r.id;
        const dim = hasSelection && !selected && !hot;
        const valuePct = r.score === null ? 0 : ((r.score - min) / span) * 100;
        const left = Math.min(zeroPct, valuePct);
        const width = Math.abs(valuePct - zeroPct);
        const color = familyColor(r.model);
        const failed = r.status === "failed";
        return (
          <li key={r.id}>
            <button
              type="button"
              aria-pressed={selected}
              aria-label={`${entryLabel(r)}${r.agent ? `, ${r.agent}` : ""}: бал ${r.score === null ? (failed ? FAILED : NO_DATA) : scoreText(r)}.${r.alert ? ` Застереження: ${r.alert}.` : ""} ${selected ? "Прибрати з порівняння" : "Додати до порівняння"}`}
              onClick={() => onToggle(r.id)}
              onMouseEnter={() => onHover(r.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(r.id)}
              onBlur={() => onHover(null)}
              className={`kb-motion w-full grid grid-cols-1 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_5.5rem] items-center gap-x-3 gap-y-1 rounded-lg px-2 py-1.5 text-left cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-on-primary ${
                hot ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
              }`}
            >
              <span className="min-w-0 flex items-center gap-2">
                <span
                  className="w-4 h-4 shrink-0 rounded-full text-[10px] font-bold inline-flex items-center justify-center"
                  style={selected ? { background: color, color: "var(--canvas-night)" } : { background: color, opacity: dim ? 0.35 : 0.9, transform: "scale(0.55)" }}
                  aria-hidden="true"
                >
                  {selected ? slot + 1 : ""}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-on-primary truncate" title={entryLabel(r)}>
                    {r.model}
                    {r.config && <span className="ml-1.5 font-mono text-[11px] font-normal text-ink-mute">{r.config}</span>}
                  </span>
                  {r.agent && <span className="block text-[11px] text-ink-mute truncate">{r.agent}</span>}
                </span>
              </span>
              <span className={`relative h-3.5 rounded-sm bg-white/[0.04] ${r.score === null ? "kb-nodata" : ""}`} aria-hidden="true">
                {r.score !== null && (
                  <span
                    className="kb-motion absolute top-0 bottom-0 rounded-[3px] transition-opacity"
                    style={{
                      left: `${left}%`,
                      width: `max(${width}%, 2px)`,
                      background: color,
                      opacity: dim ? 0.3 : 1,
                      outline: hot ? "1.5px solid var(--on-primary)" : undefined,
                      outlineOffset: 1,
                    }}
                  />
                )}
                {min < 0 && <span className="absolute top-[-2px] bottom-[-2px] w-px bg-hairline-dark" style={{ left: `${zeroPct}%` }} />}
              </span>
              <span className={`text-sm tabular-nums sm:text-right ${r.score === null ? (failed ? "text-on-primary-mute font-semibold text-xs" : "text-ink-mute italic text-xs") : "font-semibold text-on-primary"}`}>
                {r.score === null ? (failed ? FAILED : NO_DATA) : scoreText(r)}
                {r.alert && <AlertMark text={r.alert} />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
