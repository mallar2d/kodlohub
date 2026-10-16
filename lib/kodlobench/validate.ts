import { isCategoryId } from "./categories";
import type { PublishedFile, PublishedMedia, PublishedMetric, PublishedResult } from "./types";

const ID_RE = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.+-]+Z?)?$/;
const CURRENCY_RE = /^[A-Z]{3}$/;

const MAX_TEXT = 200;
const MAX_NOTES = 2000;
const MAX_METRICS = 24;
const MAX_MEDIA = 12;

/** Ids with this prefix belong to development fixtures and are never accepted from a published file. */
export const SYNTHETIC_ID_PREFIX = "synthetic-";

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function text(v: unknown, max = MAX_TEXT): string | null | undefined {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (t.length === 0) return null;
  return t.length > max ? undefined : t;
}

/** `undefined` = invalid, `null` = absent (no data). Zero is a real value. */
function num(v: unknown, opts: { nonNegative?: boolean; integer?: boolean } = {}): number | null | undefined {
  if (v === undefined || v === null) return null;
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  if (opts.nonNegative && v < 0) return undefined;
  if (opts.integer && !Number.isInteger(v)) return undefined;
  return v;
}

function httpsUrl(v: unknown): string | undefined {
  if (typeof v !== "string" || v.length > 2048) return undefined;
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

function parseMetrics(v: unknown): PublishedMetric[] | undefined {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > MAX_METRICS) return undefined;
  const out: PublishedMetric[] = [];
  for (const item of v) {
    if (!isObj(item)) return undefined;
    const label = text(item.label, 80);
    if (!label) return undefined;
    let value: PublishedMetric["value"];
    if (item.value === undefined || item.value === null) value = null;
    else if (typeof item.value === "number" && Number.isFinite(item.value)) value = item.value;
    else if (typeof item.value === "string" && item.value.length <= MAX_TEXT) value = item.value;
    else return undefined;
    const unit = text(item.unit, 24);
    if (unit === undefined) return undefined;
    out.push(unit ? { label, value, unit } : { label, value });
  }
  return out;
}

function parseMedia(v: unknown): PublishedMedia[] | undefined {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > MAX_MEDIA) return undefined;
  const out: PublishedMedia[] = [];
  for (const item of v) {
    if (!isObj(item)) return undefined;
    if (item.kind !== "image" && item.kind !== "video" && item.kind !== "link") return undefined;
    const url = httpsUrl(item.url);
    const title = text(item.title);
    const alt = text(item.alt);
    if (!url || title === undefined || alt === undefined) return undefined;
    const m: PublishedMedia = { kind: item.kind, url };
    if (title) m.title = title;
    if (alt) m.alt = alt;
    out.push(m);
  }
  return out;
}

export function parseResult(raw: unknown, opts: { allowSynthetic?: boolean } = {}): PublishedResult | null {
  if (!isObj(raw)) return null;
  const id = typeof raw.id === "string" && ID_RE.test(raw.id) ? raw.id : null;
  if (!id) return null;
  if (id.startsWith(SYNTHETIC_ID_PREFIX) && !opts.allowSynthetic) return null;
  if (!isCategoryId(raw.category)) return null;
  const model = text(raw.model);
  if (!model) return null;

  const agent = text(raw.agent);
  const config = text(raw.config);
  const score = num(raw.score);
  let status: PublishedResult["status"] = null;
  if (raw.status !== undefined && raw.status !== null) {
    if (raw.status !== "failed") return null;
    // A failed attempt has no score.
    if (score !== null) return null;
    status = "failed";
  }
  const timeSeconds = num(raw.timeSeconds, { nonNegative: true });
  const tokens = num(raw.tokens, { nonNegative: true, integer: true });
  const cost = num(raw.cost, { nonNegative: true });
  const notes = text(raw.notes, MAX_NOTES);
  const alert = text(raw.alert, 400);
  const metrics = parseMetrics(raw.metrics);
  const media = parseMedia(raw.media);

  let publishedAt: string | null = null;
  if (raw.publishedAt !== undefined && raw.publishedAt !== null) {
    if (typeof raw.publishedAt !== "string" || !ISO_DATE_RE.test(raw.publishedAt)) return null;
    publishedAt = raw.publishedAt;
  }

  if (
    agent === undefined || config === undefined || score === undefined ||
    timeSeconds === undefined || tokens === undefined || cost === undefined ||
    notes === undefined || alert === undefined || !metrics || !media
  ) {
    return null;
  }

  // Explicit field-by-field copy: unknown keys are dropped here.
  return {
    id,
    category: raw.category as string,
    model,
    agent,
    config,
    score,
    status,
    timeSeconds,
    tokens,
    cost,
    publishedAt,
    metrics,
    notes,
    alert,
    media,
  };
}

export type ParsedFile =
  | { ok: true; results: PublishedResult[]; updatedAt: string | null; currency: string | null; rejected: number }
  | { ok: false; message: string };

/** Validates a prepared file. Bad records are dropped and counted; a bad envelope fails the whole file. */
export function parsePublishedFile(raw: unknown, opts: { allowSynthetic?: boolean } = {}): ParsedFile {
  if (!isObj(raw)) return { ok: false, message: "Файл результатів має неправильний формат." };
  const file = raw as Partial<PublishedFile> & Obj;
  if (file.schemaVersion !== 1) return { ok: false, message: "Непідтримувана версія формату результатів." };
  if (!Array.isArray(file.results)) return { ok: false, message: "У файлі немає списку результатів." };

  let updatedAt: string | null = null;
  if (file.updatedAt !== undefined && file.updatedAt !== null) {
    if (typeof file.updatedAt !== "string" || !ISO_DATE_RE.test(file.updatedAt)) {
      return { ok: false, message: "Некоректна дата оновлення." };
    }
    updatedAt = file.updatedAt;
  }

  let currency: string | null = null;
  if (file.currency !== undefined && file.currency !== null) {
    if (typeof file.currency !== "string" || !CURRENCY_RE.test(file.currency)) {
      return { ok: false, message: "Некоректний код валюти." };
    }
    currency = file.currency;
  }

  const seen = new Set<string>();
  const results: PublishedResult[] = [];
  let rejected = 0;
  for (const item of file.results) {
    const parsed = parseResult(item, opts);
    if (!parsed || seen.has(parsed.id)) {
      rejected += 1;
      continue;
    }
    seen.add(parsed.id);
    results.push(parsed);
  }

  if (!currency && results.some((r) => r.cost !== null)) {
    return { ok: false, message: "Для вартості не вказано валюту." };
  }

  return { ok: true, results, updatedAt, currency, rejected };
}
