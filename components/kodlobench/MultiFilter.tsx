"use client";

import { useEffect, useRef } from "react";

interface Props {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

/** Native <details> disclosure with a checkbox list: keyboard and screen-reader friendly by default. */
export default function MultiFilter({ label, options, selected, onChange }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onDown = (e: MouseEvent) => {
      if (el.open && !el.contains(e.target as Node)) el.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && el.open) {
        el.open = false;
        el.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    el.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      el.removeEventListener("keydown", onKey);
    };
  }, []);

  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);

  return (
    <details ref={ref} className="sm:relative">
      <summary
        className={`list-none cursor-pointer select-none flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary [&::-webkit-details-marker]:hidden ${
          selected.length > 0
            ? "border-on-primary/50 text-on-primary"
            : "border-hairline-dark text-on-primary-mute hover:text-on-primary hover:border-on-primary-mute"
        } ${options.length === 0 ? "opacity-50 pointer-events-none" : ""}`}
        aria-disabled={options.length === 0}
      >
        {label}
        {selected.length > 0 && <span className="font-mono">{selected.length}</span>}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="absolute left-0 right-0 sm:right-auto top-full mt-2 z-30 sm:w-72 max-h-72 overflow-y-auto rounded-xl border border-hairline-dark bg-canvas-night-soft p-2 shadow-2xl">
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full text-left px-2 py-1.5 mb-1 text-xs text-ink-mute hover:text-on-primary cursor-pointer"
          >
            Скинути вибір
          </button>
        )}
        {options.map((opt) => (
          <label
            key={opt}
            className="flex items-start gap-2.5 px-2 py-1.5 rounded-lg text-sm text-on-primary hover:bg-canvas-night cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="mt-1 accent-[var(--theme-accent)]"
            />
            <span className="break-words min-w-0">{opt}</span>
          </label>
        ))}
      </div>
    </details>
  );
}
