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

/**
 * Overall rows: one per configuration (model + agent + config) that has exactly one result with a
 * published score in each of the four categories. The score is the plain sum of the four (all
 * coefficients 1), divided by 100 for display (2200 -> 22,00). A configuration missing from any
 * category, or with a missing score, gets no overall row: a gap is never counted as zero.
 *
 * Time, tokens and cost are the totals over the four categories, or missing if any part is missing.
 */
export function buildOverall(results: readonly PublishedResult[]): PublishedResult[] {
  const groups = new Map<string, PublishedResult[]>();
  for (const r of results) {
    const k = key(r);
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }

  const out: PublishedResult[] = [];
  for (const [k, group] of groups) {
    const parts = CATEGORIES.map((c) => group.filter((r) => r.category === c.id));
    // Every category needs exactly one record, scored or failed. A plain gap means "not known yet".
    if (parts.some((p) => p.length !== 1 || (p[0].score === null && p[0].status !== "failed"))) continue;
    const rows = parts.map((p) => p[0]);
    const failed = rows.some((r) => r.status === "failed");

    const metrics: PublishedMetric[] = rows.map((r, i) => ({
      label: CATEGORIES[i].name,
      value: r.status === "failed" ? "Не пройдено" : r.score,
    }));
    out.push({
      id: `${OVERALL_ID}-${hash(k)}`,
      category: OVERALL_ID,
      model: rows[0].model,
      agent: rows[0].agent,
      config: rows[0].config,
      // With a failed test there is no total: the overall row says so instead of inventing a number.
      score: failed ? null : round((sumOrNull(rows.map((r) => r.score)) as number) / OVERALL_DIVISOR),
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
      media: [],
    });
  }
  return out;
}
