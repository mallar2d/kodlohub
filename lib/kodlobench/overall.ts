import { CATEGORIES, OVERALL_DIVISOR, OVERALL_ID } from "./categories";
import type { PublishedMetric, PublishedResult } from "./types";

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function key(r: PublishedResult): string {
  return [r.model, r.agent ?? "", r.config ?? ""].join("\u0000");
}

function sumOrNull(values: (number | null)[]): number | null {
  let total = 0;
  for (const v of values) {
    if (v === null) return null;
    total += v;
  }
  return total;
}

const round = (v: number) => Math.round(v * 1e6) / 1e6;

export interface OverallOptions {
  /** Category ids left out of the total. At least one category always stays in. */
  exclude?: readonly string[];
}

/** The categories that count toward the total for a given exclusion list. */
export function includedCategories(exclude: readonly string[] = []) {
  const kept = CATEGORIES.filter((c) => !exclude.includes(c.id));
  return kept.length > 0 ? kept : CATEGORIES;
}

/**
 * Overall rows: one per configuration (model + agent + config) that has exactly one result in each
 * counted category (scored, or failed). The score is the plain sum of the counted categories (all
 * coefficients 1), divided by 100 for display (2200 -> 22,00). When a category is left out, the sum
 * is scaled up to the same maximum (4 / counted), so the index still tops out at 22,00. A
 * configuration missing from a counted category, or with a missing score, gets no overall row: a gap
 * is never counted as zero.
 *
 * Time, tokens, cost and warnings are totals over the counted categories only, or missing if any
 * part is missing. Left-out categories stay visible among the components, marked as not counted.
 */
export function buildOverall(results: readonly PublishedResult[], options: OverallOptions = {}): PublishedResult[] {
  const counted = includedCategories(options.exclude);
  const scale = CATEGORIES.length / counted.length;

  const groups = new Map<string, PublishedResult[]>();
  for (const r of results) {
    if (r.category === OVERALL_ID) continue;
    const k = key(r);
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }

  const out: PublishedResult[] = [];
  for (const [k, group] of groups) {
    const parts = counted.map((c) => group.filter((r) => r.category === c.id));
    // Every counted category needs exactly one record, scored or failed. A plain gap means "not known yet".
    if (parts.some((p) => p.length !== 1 || (p[0].score === null && p[0].status !== "failed"))) continue;
    const rows = parts.map((p) => p[0]);
    const failed = rows.some((r) => r.status === "failed");

    const metrics: PublishedMetric[] = CATEGORIES.map((c) => {
      const r = group.find((x) => x.category === c.id);
      const isCounted = counted.some((x) => x.id === c.id);
      const text = !r ? null : r.status === "failed" ? "Не пройдено" : r.score;
      if (isCounted || text === null) return { label: c.name, value: text };
      return { label: c.name, value: `${text} (не враховано)` };
    });
    const first = rows[0];
    out.push({
      id: `${OVERALL_ID}-${hash(k)}`,
      category: OVERALL_ID,
      model: first.model,
      agent: first.agent,
      config: first.config,
      // With a failed test there is no total: the overall row says so instead of inventing a number.
      score: failed ? null : round(((sumOrNull(rows.map((r) => r.score)) as number) * scale) / OVERALL_DIVISOR),
      status: failed ? "failed" : null,
      timeSeconds: sumOrNull(rows.map((r) => r.timeSeconds)),
      tokens: sumOrNull(rows.map((r) => r.tokens)),
      cost: (() => {
        const c = sumOrNull(rows.map((r) => r.cost));
        return c === null ? null : round(c);
      })(),
      publishedAt: null,
      metrics,
      notes: null,
      // A warning on any counted component is surfaced on the overall row too, with its category.
      alert: (() => {
        const parts = rows.flatMap((r) => (r.alert ? [`${CATEGORIES.find((c) => c.id === r.category)?.name}: ${r.alert}`] : []));
        return parts.length > 0 ? parts.join(" ") : null;
      })(),
      media: [],
    });
  }
  return out;
}

/** Published rows plus the derived overall rows for the chosen exclusion list. */
export function withOverall(results: readonly PublishedResult[], exclude: readonly string[] = []): PublishedResult[] {
  return [...results.filter((r) => r.category !== OVERALL_ID), ...buildOverall(results, { exclude })];
}
