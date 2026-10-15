import type { MetricKey, PublishedResult } from "./types";

export const NO_DATA = "Немає даних";

const nf = (digits: number) =>
  new Intl.NumberFormat("uk-UA", { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export function formatScore(v: number | null): string {
  return v === null ? NO_DATA : nf(2).format(v);
}

/** Seconds -> "45 с", "12 хв 05 с", "1 год 02 хв". Zero is a real "0 с". */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return NO_DATA;
  if (seconds < 60) return `${nf(1).format(seconds)} с`;
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} год ${String(m).padStart(2, "0")} хв`;
  return `${m} хв ${String(s).padStart(2, "0")} с`;
}

export function formatTokens(v: number | null): string {
  if (v === null) return NO_DATA;
  if (v >= 1_000_000) return `${nf(2).format(v / 1_000_000)} млн`;
  if (v >= 10_000) return `${nf(1).format(v / 1000)} тис`;
  return nf(0).format(v);
}

export function formatTokensFull(v: number | null): string {
  return v === null ? NO_DATA : nf(0).format(v);
}

export function formatCost(v: number | null, currency: string | null): string {
  if (v === null) return NO_DATA;
  if (currency) {
    try {
      return new Intl.NumberFormat("uk-UA", {
        style: "currency",
        currency,
        minimumFractionDigits: v < 10 ? 2 : 0,
        maximumFractionDigits: v < 10 ? 3 : 2,
      }).format(v);
    } catch {
      /* unknown code: fall through */
    }
  }
  return `${nf(3).format(v)}${currency ? ` ${currency}` : ""}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return NO_DATA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NO_DATA;
  return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

export function metricValue(r: PublishedResult, key: MetricKey): number | null {
  switch (key) {
    case "score":
      return r.score;
    case "cost":
      return r.cost;
    case "time":
      return r.timeSeconds;
    case "tokens":
      return r.tokens;
  }
}

export const METRIC_LABEL: Record<MetricKey, string> = {
  score: "Бал",
  cost: "Вартість",
  time: "Час",
  tokens: "Токени",
};

export function formatMetric(r: PublishedResult, key: MetricKey, currency: string | null): string {
  switch (key) {
    case "score":
      return formatScore(r.score);
    case "cost":
      return formatCost(r.cost, currency);
    case "time":
      return formatDuration(r.timeSeconds);
    case "tokens":
      return formatTokens(r.tokens);
  }
}

/** "Model · config" — the human label that keeps configurations of one model apart. */
export function entryLabel(r: Pick<PublishedResult, "model" | "config">): string {
  return r.config ? `${r.model} · ${r.config}` : r.model;
}
