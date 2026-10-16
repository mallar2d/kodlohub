"use client";

import { useEffect, useRef } from "react";
import { OVERALL_ID, VIEW_CATEGORIES } from "@/lib/kodlobench/categories";

interface Props {
  active: string;
  counts: Record<string, number>;
  onChange: (id: string) => void;
}

/**
 * One row of pills like the site menu: the overall view first, a divider, then the four benchmarks.
 * Benchmarks without published results stay selectable but are dimmed. On a phone the row scrolls.
 */
export default function CategoryTabs({ active, counts, onChange }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // On a phone the row scrolls: keep the active pill in view.
  useEffect(() => {
    const i = VIEW_CATEGORIES.findIndex((c) => c.id === active);
    refs.current[i]?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % VIEW_CATEGORIES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + VIEW_CATEGORIES.length) % VIEW_CATEGORIES.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = VIEW_CATEGORIES.length - 1;
    else return;
    e.preventDefault();
    refs.current[next]?.focus();
    onChange(VIEW_CATEGORIES[next].id);
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
      <div
        role="tablist"
        aria-label="Загальний бал і бенчмарки"
        className="inline-flex items-center gap-1 rounded-full border border-hairline-dark bg-canvas-night-soft/80 p-1 min-w-max"
      >
        {VIEW_CATEGORIES.map((c, i) => {
          const selected = c.id === active;
          const empty = (counts[c.id] ?? 0) === 0;
          return (
            <div key={c.id} className="flex items-center">
              {i === 1 && <span className="w-px h-5 bg-hairline-dark mx-1.5" aria-hidden="true" />}
              <button
                ref={(el) => {
                  refs.current[i] = el;
                }}
                role="tab"
                id={`kb-tab-${c.id}`}
                aria-selected={selected}
                aria-controls="kb-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => onChange(c.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-on-primary ${
                  c.id === OVERALL_ID ? "font-bold" : "font-semibold"
                } ${
                  selected
                    ? "bg-on-primary text-ink"
                    : `${empty ? "text-ink-mute" : "text-on-primary-mute"} hover:text-on-primary hover:bg-white/[0.06]`
                }`}
              >
                {c.name}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
