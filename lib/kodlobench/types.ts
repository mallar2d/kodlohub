/**
 * Public data contract of the KodloBench page.
 *
 * Only the fields listed here ever reach the browser. The validator in
 * `validate.ts` copies fields one by one (allow-list) and drops everything else,
 * so extra keys in a prepared file can never leak to visitors.
 *
 * `null` means "no data" and is always distinct from a real `0`.
 */

export interface PublishedMetric {
  label: string;
  value: string | number | null;
  unit?: string;
}

export type PublishedMediaKind = "image" | "video" | "link";

export interface PublishedMedia {
  kind: PublishedMediaKind;
  /** https URL supplied by the owner for publication. */
  url: string;
  title?: string;
  /** Alt text for images. */
  alt?: string;
}

export interface PublishedResult {
  /** Stable unique key, `[a-z0-9._-]`. Distinguishes configurations of the same model. */
  id: string;
  category: string;
  model: string;
  /** CLI agent. */
  agent: string | null;
  /** Configuration label (free text). */
  config: string | null;
  /** Published score, as given. */
  score: number | null;
  timeSeconds: number | null;
  tokens: number | null;
  /** Amount in the file-level currency. */
  cost: number | null;
  /** ISO date (YYYY-MM-DD or full ISO). */
  publishedAt: string | null;
  metrics: PublishedMetric[];
  notes: string | null;
  media: PublishedMedia[];
}

export interface PublishedFile {
  schemaVersion: 1;
  /** ISO date of the last publication, or null. */
  updatedAt: string | null;
  /** ISO 4217 code of every `cost`. Required when any record has a cost. */
  currency: string | null;
  results: unknown[];
}

export type LoadResult =
  | {
      status: "ok";
      results: PublishedResult[];
      updatedAt: string | null;
      currency: string | null;
      /** Records dropped because they failed validation. */
      rejected: number;
      /** True only in the development-only synthetic mode. */
      synthetic: boolean;
    }
  | { status: "error"; message: string };

export type MetricKey = "score" | "cost" | "time" | "tokens";
export type SortKey = "model" | "agent" | "config" | "score" | "time" | "tokens" | "cost";
export type SortDir = "asc" | "desc";
export type ChartView = "bars" | "cost" | "time" | "tokens";
