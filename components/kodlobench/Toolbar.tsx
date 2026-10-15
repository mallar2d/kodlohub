"use client";

import MultiFilter from "./MultiFilter";

interface Props {
  query: string;
  onQuery: (q: string) => void;
  modelOptions: string[];
  agentOptions: string[];
  models: string[];
  agents: string[];
  onModels: (v: string[]) => void;
  onAgents: (v: string[]) => void;
  onlySelected: boolean;
  selectedCount: number;
  onOnlySelected: (v: boolean) => void;
  dirty: boolean;
  onReset: () => void;
  shown: number;
  total: number;
}

export default function Toolbar(p: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex flex-col lg:flex-row lg:items-center gap-3 p-2 rounded-2xl bg-canvas-night-soft/80 border border-hairline-dark">
        <label className="relative flex-1 min-w-0">
          <span className="sr-only">Пошук за моделлю, агентом чи конфігурацією</span>
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute"
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={p.query}
            onChange={(e) => p.onQuery(e.target.value)}
            placeholder="Пошук: модель, агент, конфігурація"
            className="w-full bg-transparent rounded-full border border-hairline-dark pl-9 pr-4 py-2 text-sm text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary/60"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <MultiFilter label="Моделі" options={p.modelOptions} selected={p.models} onChange={p.onModels} />
          <MultiFilter label="Агенти" options={p.agentOptions} selected={p.agents} onChange={p.onAgents} />
          <button
            type="button"
            role="switch"
            aria-checked={p.onlySelected}
            disabled={p.selectedCount === 0}
            onClick={() => p.onOnlySelected(!p.onlySelected)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary ${
              p.onlySelected
                ? "bg-on-primary text-ink border-on-primary"
                : "border-hairline-dark text-on-primary-mute hover:text-on-primary hover:border-on-primary-mute"
            }`}
          >
            Лише обрані
          </button>
          {p.dirty && (
            <button
              type="button"
              onClick={p.onReset}
              className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-ink-mute hover:text-on-primary cursor-pointer"
            >
              Скинути
            </button>
          )}
        </div>
      </div>
      <p className="micro-cap text-ink-mute px-1" role="status" aria-live="polite">
        Показано {p.shown} з {p.total}
        {p.selectedCount > 0 && !p.onlySelected && " · обрані записи показано завжди"}
      </p>
    </div>
  );
}
