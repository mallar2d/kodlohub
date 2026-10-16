"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { OVERALL_ID, getCategory, scoreMaxFor } from "@/lib/kodlobench/categories";
import { entryLabel, formatCost, formatDuration, formatScore, formatTokensFull, scoreText } from "@/lib/kodlobench/format";
import type { PublishedResult, ScatterAxis } from "@/lib/kodlobench/types";
import { scatterSplit } from "@/lib/kodlobench/view";
import FamilyLegend from "./FamilyLegend";
import { ChartSkeleton } from "./Notices";
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

interface Props {
  categoryId: string;
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
export default function ChartPanel({ categoryId, logs, onToggleLog, rows, slots, hoverId, onHover, onToggle, currency }: Props) {
  const hovered = hoverId ? rows.find((r) => r.id === hoverId) : undefined;
  const isOverall = categoryId === OVERALL_ID;
  const categoryName = getCategory(categoryId)?.name ?? "";
  const max = formatScore(scoreMaxFor(categoryId), categoryId);

  const splits = useMemo(
    () => Object.fromEntries(SCATTERS.map((s) => [s.axis, scatterSplit(rows, s.axis, logs.includes(s.axis))])) as Record<ScatterAxis, ReturnType<typeof scatterSplit>>,
    [rows, logs],
  );

  const noData = rows.filter((r) => r.score === null && r.status !== "failed").length;
  const failed = rows.filter((r) => r.status === "failed").length;

  return (
    <div className="space-y-6">
      <Card
        title={isOverall ? "KodloBench Intelligence Index" : `${categoryName}: бали`}
        sub={isOverall ? `Сума балів чотирьох категорій, максимум ${max}.` : `Опублікований бал, максимум ${max}.`}
      >
        <FamilyLegend rows={rows} />
        <ScoreColumns rows={rows} slots={slots} hoverId={hoverId} onHover={onHover} onToggle={onToggle} categoryId={categoryId} />
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
            sub={`Кожна точка — один запис; підписи показують модель. Потрібні і бал, і ${need}.`}
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
