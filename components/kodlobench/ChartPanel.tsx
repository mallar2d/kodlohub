"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CATEGORIES, OPTIONAL_CATEGORY, OVERALL_ID, getCategory, overallCaption } from "@/lib/kodlobench/categories";
import { entryLabel, formatCost, formatDuration, formatTokensFull, scoreText } from "@/lib/kodlobench/format";
import type { PublishedResult, ScatterAxis } from "@/lib/kodlobench/types";
import { scatterSplit } from "@/lib/kodlobench/view";
import FamilyLegend from "./FamilyLegend";
import type { OverallPair } from "@/lib/kodlobench/overall";
import { AlertIcon, ChartSkeleton } from "./Notices";
import ScoreColumns from "./ScoreColumns";

// Recharts is heavy and browser-only: load it on demand, with a skeleton while it arrives.
const ScatterPlot = dynamic(() => import("./ScatterPlot"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

const SCATTERS: { axis: ScatterAxis; title: string; need: string }[] = [
  { axis: "cost", title: "Бал і вартість", need: "вартість" },
  { axis: "time", title: "Бал і час", need: "час" },
  { axis: "tokens", title: "Бал і токени", need: "токени" },
];

const PDR_NOTE = `${OPTIONAL_CATEGORY.name} можна не враховувати: він перевіряє загальні навички моделі, а не омнімодальність і програмування, і його оцінка часто суб’єктивна.`;

/** Key to the shades in the overall columns: what the optional category adds or takes away. */
function EffectLegend({ name }: { name: string }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-on-primary-mute" aria-label={`Як ${name} впливає на загальний бал`}>
      <li className="inline-flex items-center gap-1.5">
        <svg width="16" height="12" aria-hidden="true">
          <rect x="0.6" y="0.6" width="14.8" height="10.8" rx="2" fill="var(--on-primary-mute)" fillOpacity="0.4" stroke="var(--on-primary-mute)" />
        </svg>
        {name} додає
      </li>
      <li className="inline-flex items-center gap-1.5">
        <svg width="16" height="12" aria-hidden="true">
          <defs>
            <pattern id="kb-legend-neg" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="5" stroke="var(--on-primary-mute)" strokeWidth="2" />
            </pattern>
          </defs>
          <rect x="0.6" y="0.6" width="14.8" height="10.8" rx="2" fill="url(#kb-legend-neg)" stroke="var(--on-primary-mute)" strokeDasharray="3 2" />
        </svg>
        {name} забирає
      </li>
      <li className="inline-flex items-center gap-1.5">
        <svg width="16" height="12" aria-hidden="true">
          <line x1="0" y1="6" x2="16" y2="6" stroke="var(--on-primary)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        поточний режим
      </li>
    </ul>
  );
}

interface Props {
  categoryId: string;
  exclude: string[];
  onToggleExclude: (id: string) => void;
  /** Both modes of the overall score for the same rows (overall view only). */
  pairs: Map<string, OverallPair>;
  logs: ScatterAxis[];
  onToggleLog: (axis: ScatterAxis) => void;
  rows: PublishedResult[];
  slots: (string | null)[];
  hoverId: string | null;
  onHover: (id: string | null) => void;
  onToggle: (id: string) => void;
  currency: string | null;
}

function Readout({ r, currency }: { r: PublishedResult | undefined; currency: string | null }) {
  return (
    <div className="min-h-[2.75rem] text-sm" role="status" aria-live="off">
      {r && (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-xl border border-hairline-dark px-4 py-2.5">
          <span className="font-semibold text-on-primary">{entryLabel(r)}</span>
          {r.agent && <span className="text-ink-mute text-xs">{r.agent}</span>}
          <span className="text-on-primary-mute tabular-nums">
            Бал <b className="text-on-primary">{scoreText(r)}</b>
          </span>
          <span className="text-on-primary-mute tabular-nums">Час {formatDuration(r.timeSeconds)}</span>
          <span className="text-on-primary-mute tabular-nums">Токени {formatTokensFull(r.tokens)}</span>
          <span className="text-on-primary-mute tabular-nums">Вартість {formatCost(r.cost, currency)}</span>
        </div>
      )}
    </div>
  );
}

function Card({ title, sub, aside, children }: { title: string; sub?: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card-dark p-4 sm:p-6 space-y-4" aria-label={title}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-on-primary">{title}</h2>
          {sub && <p className="text-xs text-ink-mute mt-1 max-w-2xl">{sub}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * All charts at once, one under another: the score columns first, then score against cost, time
 * and tokens. They share one selection and one highlight, so a model picked or hovered in any of
 * them is picked and highlighted in all the others and in the table.
 */
export default function ChartPanel({ categoryId, exclude, onToggleExclude, pairs, logs, onToggleLog, rows, slots, hoverId, onHover, onToggle, currency }: Props) {
  const [noteOpen, setNoteOpen] = useState(false);
  const hovered = hoverId ? rows.find((r) => r.id === hoverId) : undefined;
  const isOverall = categoryId === OVERALL_ID;
  const category = getCategory(categoryId);

  const splits = useMemo(
    () => Object.fromEntries(SCATTERS.map((s) => [s.axis, scatterSplit(rows, s.axis, logs.includes(s.axis))])) as Record<ScatterAxis, ReturnType<typeof scatterSplit>>,
    [rows, logs],
  );

  const hasEffect = isOverall && rows.some((r) => { const p = pairs.get(r.id); return !!p && p.with !== null && p.without !== null && p.with !== p.without; });
  const noData = rows.filter((r) => r.score === null && r.status !== "failed").length;
  const failed = rows.filter((r) => r.status === "failed").length;

  return (
    <div className="space-y-6">
      <Card
        title={isOverall ? "KodloBench Intelligence Index" : `${category?.name ?? ""}: бали`}
        sub={isOverall ? overallCaption(CATEGORIES.filter((c) => exclude.includes(c.id)).map((c) => c.name)) : category?.caption}
        aside={
          isOverall ? (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setNoteOpen((v) => !v)}
                aria-expanded={noteOpen}
                aria-controls="kb-pdr-note"
                aria-label={`Чому ${OPTIONAL_CATEGORY.name} можна не враховувати`}
                title={PDR_NOTE}
                className="w-9 h-9 rounded-full border border-hairline-dark text-on-primary-mute hover:text-on-primary hover:border-on-primary-mute inline-flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary"
              >
                <AlertIcon size={16} />
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={exclude.includes(OPTIONAL_CATEGORY.id)}
                onClick={() => onToggleExclude(OPTIONAL_CATEGORY.id)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary ${
                  exclude.includes(OPTIONAL_CATEGORY.id)
                    ? "bg-on-primary text-ink border-on-primary"
                    : "border-hairline-dark text-on-primary-mute hover:text-on-primary hover:border-on-primary-mute"
                }`}
              >
                Без {OPTIONAL_CATEGORY.name}
              </button>
            </div>
          ) : undefined
        }
      >
        {isOverall && noteOpen && (
          <p id="kb-pdr-note" role="note" className="flex items-start gap-2.5 rounded-xl border border-hairline-dark px-4 py-3 text-sm text-on-primary-mute">
            <AlertIcon size={16} className="mt-0.5 shrink-0 text-on-primary" />
            <span>{PDR_NOTE}</span>
          </p>
        )}
        <FamilyLegend rows={rows} />
        {isOverall && hasEffect && <EffectLegend name={OPTIONAL_CATEGORY.name} />}
        <ScoreColumns
          rows={rows}
          slots={slots}
          hoverId={hoverId}
          onHover={onHover}
          onToggle={onToggle}
          categoryId={categoryId}
          pairs={isOverall ? pairs : undefined}
          pairName={OPTIONAL_CATEGORY.name}
        />
        {failed > 0 && <p className="text-xs text-ink-mute">Не пройшли тест: {failed}. Балу в них немає, вони позначені «Не пройдено».</p>}
        {noData > 0 && <p className="text-xs text-ink-mute">Записів без опублікованого балу: {noData}. Їх позначено «Немає даних».</p>}
        <Readout r={hovered} currency={currency} />
      </Card>

      {SCATTERS.map(({ axis, title, need }) => {
        const split = splits[axis];
        const log = logs.includes(axis);
        return (
          <Card
            key={axis}
            title={title}
            aside={
              <label className="inline-flex items-center gap-2 text-xs text-on-primary-mute cursor-pointer select-none shrink-0">
                <input type="checkbox" checked={log} onChange={() => onToggleLog(axis)} className="accent-[var(--theme-accent)]" />
                Логарифмічна шкала осі X
              </label>
            }
          >
            {split.plotted.length > 0 ? (
              <ScatterPlot
                rows={split.plotted}
                xKey={axis}
                log={log}
                slots={slots}
                hoverId={hoverId}
                onHover={onHover}
                onToggle={onToggle}
                currency={currency}
              />
            ) : (
              <div className="py-16 text-center text-sm text-on-primary-mute" role="status">
                Немає даних для цього графіка: потрібні і бал, і {need}.
              </div>
            )}
            {split.missing > 0 && split.plotted.length > 0 && (
              <p className="text-xs text-ink-mute">
                Не показано записів: {split.missing}. Для них немає даних{log ? " (або значення не додатне для логарифмічної шкали)" : ""}; вони доступні в таблиці.
              </p>
            )}
            <Readout r={hovered} currency={currency} />
          </Card>
        );
      })}
    </div>
  );
}
