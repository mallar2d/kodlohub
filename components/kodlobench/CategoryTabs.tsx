"use client";

import { useRef } from "react";
import { OVERALL_ID, VIEW_CATEGORIES } from "@/lib/kodlobench/categories";

interface Props {
  active: string;
  counts: Record<string, number>;
  onChange: (id: string) => void;
}

/** Four categories. No combined tab on purpose: categories are never merged into one score. */
export default function CategoryTabs({ active, counts, onChange }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeCategory = VIEW_CATEGORIES.find((c) => c.id === active) ?? VIEW_CATEGORIES[0];

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
    <div>
      <div
        role="tablist"
        aria-label="Категорії KodloBench"
        className="grid grid-cols-2 md:grid-cols-5 gap-2"
      >
        {VIEW_CATEGORIES.map((c, i) => {
          const selected = c.id === active;
          const n = counts[c.id] ?? 0;
          return (
            <button
              key={c.id}
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
              className={`text-left rounded-xl border p-3 sm:p-4 transition-colors cursor-pointer ${c.id === OVERALL_ID ? "col-span-2 md:col-span-1" : ""} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary ${
                selected
                  ? "bg-canvas-night-soft border-on-primary/50"
                  : "bg-canvas-night-soft/40 border-hairline-dark hover:border-on-primary-mute"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold tracking-wide text-on-primary break-words">{c.name}</span>
                {n > 0 && (
                  <span className="micro-cap text-ink-mute shrink-0" aria-label={`записів: ${n}`}>
                    {n}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p id="kb-caption" className="mt-3 text-sm leading-relaxed text-on-primary-mute max-w-3xl" aria-live="polite">
        {activeCategory.caption}
      </p>
    </div>
  );
}
