"use client";

import type { PublishedResult, SortDir, SortKey } from "@/lib/kodlobench/types";
import { entryLabel, formatCost, formatDuration, formatScore, formatTokens, formatTokensFull } from "@/lib/kodlobench/format";
import { slotOf } from "@/lib/kodlobench/view";
import { NoDataText } from "./Notices";
import { slotColor } from "./palette";

interface Props {
  rows: PublishedResult[];
  sort: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  slots: (string | null)[];
  hoverId: string | null;
  onHover: (id: string | null) => void;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  currency: string | null;
  synthetic: boolean;
}

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "model", label: "Модель" },
  { key: "agent", label: "CLI-агент" },
  { key: "config", label: "Конфіг." },
  { key: "score", label: "Бал", numeric: true },
  { key: "time", label: "Час", numeric: true },
  { key: "tokens", label: "Токени", numeric: true },
  { key: "cost", label: "Вартість", numeric: true },
];

function Cell({ children, numeric, className = "" }: { children: React.ReactNode; numeric?: boolean; className?: string }) {
  return <td className={`px-3 py-2.5 text-sm ${numeric ? "text-right tabular-nums" : ""} ${className}`}>{children}</td>;
}

export default function ResultsTable({
  rows, sort, dir, onSort, slots, hoverId, onHover, onToggle, onOpen, currency, synthetic,
}: Props) {
  return (
    <div className="card-dark !p-0 overflow-hidden relative [contain:paint]">
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Таблиця результатів">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="border-b border-hairline-dark">
              {COLUMNS.map((c) => {
                const active = sort === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
                    className={`px-3 py-2.5 micro-cap text-ink-mute font-medium whitespace-nowrap ${c.numeric ? "text-right" : "text-left"} ${
                      c.key === "model" ? "sticky left-0 z-10 bg-canvas-night-soft" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSort(c.key)}
                      className={`inline-flex items-center gap-1 uppercase tracking-[0.08em] cursor-pointer hover:text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary ${
                        active ? "text-on-primary" : ""
                      }`}
                    >
                      {c.label}
                      <span aria-hidden="true" className="w-2.5 text-[10px]">
                        {active ? (dir === "asc" ? "▲" : "▼") : ""}
                      </span>
                    </button>
                  </th>
                );
              })}
              <th scope="col" className="px-3 py-2.5 w-px">
                <span className="sr-only">Деталі</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const slot = slotOf(slots, r.id);
              const selected = slot !== -1;
              const hot = hoverId === r.id;
              const label = entryLabel(r);
              return (
                <tr
                  key={r.id}
                  onMouseEnter={() => onHover(r.id)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(r.id)}
                  onBlur={() => onHover(null)}
                  aria-selected={selected}
                  className={`border-b border-hairline-dark/60 last:border-b-0 ${hot ? "bg-white/[0.06]" : selected ? "bg-white/[0.03]" : ""}`}
                >
                  <td
                    className={`sticky left-0 z-10 px-3 py-2.5 text-sm ${hot ? "bg-canvas-night-soft" : "bg-canvas-night"}`}
                    style={selected ? { boxShadow: `inset 3px 0 0 ${slotColor(slot)}` } : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={selected}
                        aria-label={`Порівняти: ${label}`}
                        onClick={() => onToggle(r.id)}
                        className="w-5 h-5 shrink-0 rounded border flex items-center justify-center text-[10px] font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary"
                        style={
                          selected
                            ? { background: slotColor(slot), borderColor: slotColor(slot), color: "var(--canvas-night)" }
                            : { borderColor: "var(--ink-mute)" }
                        }
                      >
                        {selected ? slot + 1 : ""}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpen(r.id)}
                        aria-haspopup="dialog"
                        className="text-left font-semibold text-on-primary hover:underline underline-offset-2 max-w-[14rem] truncate cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary"
                        title={r.model}
                      >
                        {r.model}
                      </button>
                      {synthetic && (
                        <span className="micro-cap text-[9px] px-1.5 rounded border border-hairline-dark text-ink-mute">СИНТ.</span>
                      )}
                    </div>
                  </td>
                  <Cell className="text-on-primary-mute whitespace-nowrap">{r.agent ?? <NoDataText />}</Cell>
                  <Cell>
                    {r.config ? (
                      <span className="inline-block rounded-full border border-hairline-dark px-2.5 py-0.5 text-xs font-mono text-on-primary-mute">
                        {r.config}
                      </span>
                    ) : (
                      <NoDataText />
                    )}
                  </Cell>
                  <Cell numeric className="font-semibold text-on-primary">
                    {r.score === null ? <NoDataText /> : formatScore(r.score, r.category)}
                  </Cell>
                  <Cell numeric className="text-on-primary-mute">
                    {r.timeSeconds === null ? <NoDataText /> : formatDuration(r.timeSeconds)}
                  </Cell>
                  <Cell numeric className="text-on-primary-mute">
                    {r.tokens === null ? <NoDataText /> : <span title={formatTokensFull(r.tokens)}>{formatTokens(r.tokens)}</span>}
                  </Cell>
                  <Cell numeric className="text-on-primary-mute">
                    {r.cost === null ? <NoDataText /> : formatCost(r.cost, currency)}
                  </Cell>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => onOpen(r.id)}
                      aria-haspopup="dialog"
                      aria-label={`Деталі: ${label}`}
                      className="micro-cap text-ink-mute hover:text-on-primary cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary"
                    >
                      Деталі
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
