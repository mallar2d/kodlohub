"use client";

import { useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import type { ChartView, PublishedResult } from "@/lib/kodlobench/types";
import { entryLabel, formatCost, formatDuration, formatTokensFull, scoreText } from "@/lib/kodlobench/format";
import { scatterSplit } from "@/lib/kodlobench/view";
import FamilyLegend from "./FamilyLegend";
import ScoreBars from "./ScoreBars";
import { ChartSkeleton } from "./Notices";

// Recharts is heavy and browser-only: load it on demand, with a skeleton while it arrives.
const ScatterPlot = dynamic(() => import("./ScatterPlot"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

const VIEWS: { key: ChartView; label: string }[] = [
  { key: "bars", label: "Бали" },
  { key: "cost", label: "Бал і вартість" },
  { key: "time", label: "Бал і час" },
  { key: "tokens", label: "Бал і токени" },
];

interface Props {
  view: ChartView;
  onView: (v: ChartView) => void;
  log: boolean;
  onLog: (v: boolean) => void;
  rows: PublishedResult[];
  slots: (string | null)[];
  hoverId: string | null;
  onHover: (id: string | null) => void;
  onToggle: (id: string) => void;
  currency: string | null;
}

function Readout({ r, currency }: { r: PublishedResult | undefined; currency: string | null }) {
  return (
    <div className="min-h-[3.25rem] rounded-xl border border-hairline-dark px-4 py-2.5 text-sm" role="status" aria-live="off">
      {r ? (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-semibold text-on-primary">{entryLabel(r)}</span>
          {r.agent && <span className="text-ink-mute text-xs">{r.agent}</span>}
          <span className="text-on-primary-mute tabular-nums">
            Бал <b className="text-on-primary">{scoreText(r)}</b>
          </span>
          <span className="text-on-primary-mute tabular-nums">Час {formatDuration(r.timeSeconds)}</span>
          <span className="text-on-primary-mute tabular-nums">Токени {formatTokensFull(r.tokens)}</span>
          <span className="text-on-primary-mute tabular-nums">Вартість {formatCost(r.cost, currency)}</span>
        </div>
      ) : (
        <span className="text-ink-mute text-xs">Наведи курсор або зфокусуй запис, щоб побачити всі значення.</span>
      )}
    </div>
  );
}

export default function ChartPanel({ view, onView, log, onLog, rows, slots, hoverId, onHover, onToggle, currency }: Props) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const hovered = hoverId ? rows.find((r) => r.id === hoverId) : undefined;

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    let n = i;
    if (e.key === "ArrowRight") n = (i + 1) % VIEWS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + VIEWS.length) % VIEWS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = VIEWS.length - 1;
    else return;
    e.preventDefault();
    tabRefs.current[n]?.focus();
    onView(VIEWS[n].key);
  }

  const xKey = view === "bars" ? null : view;
  const split = useMemo(() => (xKey ? scatterSplit(rows, xKey, log) : null), [rows, xKey, log]);
  const barsMissing = view === "bars" ? rows.filter((r) => r.score === null && r.status !== "failed").length : 0;
  const barsFailed = view === "bars" ? rows.filter((r) => r.status === "failed").length : 0;

  return (
    <section className="card-dark p-4 sm:p-6 space-y-4" aria-label="Графіки">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div role="tablist" aria-label="Вид графіка" className="flex flex-wrap gap-1">
          {VIEWS.map((v, i) => {
            const active = v.key === view;
            return (
              <button
                key={v.key}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                id={`kb-chart-tab-${v.key}`}
                aria-selected={active}
                aria-controls="kb-chart-panel"
                tabIndex={active ? 0 : -1}
                onClick={() => onView(v.key)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary ${
                  active ? "bg-on-primary text-ink" : "text-on-primary-mute hover:text-on-primary hover:bg-white/[0.06]"
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
        {xKey && (
          <label className="inline-flex items-center gap-2 text-xs text-on-primary-mute cursor-pointer select-none">
            <input
              type="checkbox"
              checked={log}
              onChange={(e) => onLog(e.target.checked)}
              className="accent-[var(--theme-accent)]"
            />
            Логарифмічна шкала осі X
          </label>
        )}
      </div>

      <FamilyLegend rows={rows} />

      <div id="kb-chart-panel" role="tabpanel" aria-labelledby={`kb-chart-tab-${view}`}>
        {view === "bars" ? (
          <ScoreBars rows={rows} slots={slots} hoverId={hoverId} onHover={onHover} onToggle={onToggle} />
        ) : split && split.plotted.length > 0 ? (
          <ScatterPlot
            rows={split.plotted}
            xKey={view as "cost" | "time" | "tokens"}
            log={log}
            slots={slots}
            hoverId={hoverId}
            onHover={onHover}
            onToggle={onToggle}
            currency={currency}
          />
        ) : (
          <div className="py-16 text-center text-sm text-on-primary-mute" role="status">
            Немає даних для цього графіка: потрібні і бал, і {view === "cost" ? "вартість" : view === "time" ? "час" : "токени"}.
          </div>
        )}
      </div>

      {split && split.missing > 0 && split.plotted.length > 0 && (
        <p className="text-xs text-ink-mute">
          Не показано записів: {split.missing}. Для них немає даних{log ? " (або значення не додатне для логарифмічної шкали)" : ""}; вони доступні в таблиці.
        </p>
      )}
      {barsFailed > 0 && (
        <p className="text-xs text-ink-mute">Не пройшли тест: {barsFailed}. Балу в них немає, вони позначені «Не пройдено».</p>
      )}
      {barsMissing > 0 && (
        <p className="text-xs text-ink-mute">Записів без опублікованого балу: {barsMissing}. Їх позначено «Немає даних».</p>
      )}

      <Readout r={hovered} currency={currency} />
    </section>
  );
}
