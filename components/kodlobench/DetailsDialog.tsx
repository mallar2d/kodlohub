"use client";

import { useEffect, useRef } from "react";
import type { PublishedResult } from "@/lib/kodlobench/types";
import {
  entryLabel,
  formatCost,
  formatDate,
  formatDuration,
  formatScore,
  formatTokensFull,
  FAILED,
  NO_DATA,
} from "@/lib/kodlobench/format";

interface Props {
  result: PublishedResult | null;
  currency: string | null;
  selected: boolean;
  full: boolean;
  onToggle: (id: string) => void;
  onClose: () => void;
  synthetic: boolean;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-hairline-dark/60 last:border-b-0">
      <dt className="micro-cap text-ink-mute shrink-0">{label}</dt>
      <dd className="text-sm text-on-primary text-right break-words min-w-0">{children}</dd>
    </div>
  );
}

const dash = <span className="text-ink-mute italic text-xs">{NO_DATA}</span>;

/** Native <dialog>: focus trap, Escape and inert background come from the browser. */
export default function DetailsDialog({ result, currency, selected, full, onToggle, onClose, synthetic }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (result && !d.open) d.showModal();
    if (!result && d.open) d.close();
  }, [result]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="kb-dialog-title"
      className="m-auto w-[min(40rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-hairline-dark bg-canvas-night text-on-primary p-0 backdrop:bg-black/70"
    >
      {result && (
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <p className="micro-cap text-ink-mute mb-1">ДЕТАЛІ РЕЗУЛЬТАТУ{synthetic ? " · СИНТЕТИЧНІ ДАНІ" : ""}</p>
              <h2 id="kb-dialog-title" className="text-xl font-bold break-words">
                {entryLabel(result)}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрити"
              className="w-8 h-8 shrink-0 rounded-full border border-hairline-dark text-ink-mute hover:text-on-primary inline-flex items-center justify-center cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </div>

          {result.alert && (
            <div role="note" className="mb-4 rounded-xl border border-on-primary-mute px-4 py-3 text-sm text-on-primary">
              <b className="mr-1.5">(!)</b>
              {result.alert}
            </div>
          )}

          <dl>
            <Row label="Модель">{result.model}</Row>
            <Row label="CLI-агент">{result.agent ?? dash}</Row>
            <Row label="Конфігурація">{result.config ?? dash}</Row>
            <Row label="Бал">
              {result.status === "failed" ? <b>{FAILED}</b> : result.score === null ? dash : <b>{formatScore(result.score, result.category)}</b>}
            </Row>
            <Row label="Час">{result.timeSeconds === null ? dash : formatDuration(result.timeSeconds)}</Row>
            <Row label="Токени">{result.tokens === null ? dash : formatTokensFull(result.tokens)}</Row>
            <Row label="Вартість">{result.cost === null ? dash : formatCost(result.cost, currency)}</Row>
            <Row label="Опубліковано">{result.publishedAt ? formatDate(result.publishedAt) : dash}</Row>
          </dl>

          {result.metrics.length > 0 && (
            <div className="mt-5">
              <p className="micro-cap text-ink-mute mb-1">{result.category === "overall" ? "СКЛАДОВІ ЗАГАЛЬНОГО БАЛУ" : "ДОДАТКОВІ ПОКАЗНИКИ"}</p>
              <dl>
                {result.metrics.map((m, i) => (
                  <Row key={`${m.label}-${i}`} label={m.label}>
                    {m.value === null ? dash : `${typeof m.value === "number" ? formatScore(m.value) : m.value}${m.unit ? ` ${m.unit}` : ""}`}
                  </Row>
                ))}
              </dl>
            </div>
          )}

          {result.notes && (
            <div className="mt-5">
              <p className="micro-cap text-ink-mute mb-1">ПРИМІТКИ</p>
              <p className="text-sm text-on-primary-mute whitespace-pre-wrap break-words">{result.notes}</p>
            </div>
          )}

          {result.media.length > 0 && (
            <div className="mt-5 space-y-3">
              <p className="micro-cap text-ink-mute">МАТЕРІАЛИ</p>
              {result.media.map((m, i) => {
                if (m.kind === "image") {
                  return (
                    <figure key={i}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt={m.alt ?? m.title ?? ""} loading="lazy" className="w-full rounded-lg border border-hairline-dark" />
                      {m.title && <figcaption className="mt-1 text-xs text-ink-mute">{m.title}</figcaption>}
                    </figure>
                  );
                }
                if (m.kind === "video") {
                  return (
                    <figure key={i}>
                      <video src={m.url} controls preload="none" playsInline className="w-full rounded-lg border border-hairline-dark" aria-label={m.title ?? "Відео"} />
                      {m.title && <figcaption className="mt-1 text-xs text-ink-mute">{m.title}</figcaption>}
                    </figure>
                  );
                }
                return (
                  <a key={i} href={m.url} target="_blank" rel="noopener noreferrer nofollow" className="block text-sm underline underline-offset-2 break-all text-on-primary">
                    {m.title ?? m.url}
                  </a>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => onToggle(result.id)} disabled={full && !selected} className="btn-ghost text-on-primary disabled:opacity-40">
              {selected ? "ПРИБРАТИ З ПОРІВНЯННЯ" : "ПОРІВНЯТИ"}
            </button>
            {full && !selected && <span className="text-xs text-on-primary-mute">Вже обрано максимум записів.</span>}
          </div>
        </div>
      )}
    </dialog>
  );
}
