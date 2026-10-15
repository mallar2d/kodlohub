import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../categories";
import { formatScore } from "../format";
import { buildOverall } from "../overall";
import type { PublishedResult } from "../types";

function r(category: string, over: Partial<PublishedResult> = {}): PublishedResult {
  return {
    id: `${category}-${over.config ?? "default"}-${over.model ?? "M"}`, category, model: "M", agent: "A", config: "default",
    score: 100, timeSeconds: 10, tokens: 1000, cost: 1, publishedAt: null, metrics: [], notes: null, media: [], ...over,
  };
}
const full = (over: Partial<PublishedResult> = {}) => CATEGORIES.map((c) => r(c.id, over));

describe("buildOverall", () => {
  it("sums the four category scores and divides by 100 (2200 -> 22,00)", () => {
    const rows = CATEGORIES.map((c) => r(c.id, { score: 550 }));
    const [o] = buildOverall(rows);
    expect(o.score).toBe(22);
    expect(o.category).toBe("overall");
    expect(formatScore(o.score, o.category)).toBe("22,00");
    expect(formatScore(550, "pdrbench-pro")).toBe("550");
  });

  it("uses coefficient 1 for every category", () => {
    const scores = [100, 200, 300, 400];
    const rows = CATEGORIES.map((c, i) => r(c.id, { score: scores[i] }));
    expect(buildOverall(rows)[0].score).toBe(10);
  });

  it("sums time, tokens and cost, and keeps parts as components", () => {
    const [o] = buildOverall(full());
    expect(o).toMatchObject({ timeSeconds: 40, tokens: 4000, cost: 4 });
    expect(o.metrics.map((m) => m.label)).toEqual(CATEGORIES.map((c) => c.name));
  });

  it("gives no overall row when a category is missing: a gap is never a zero", () => {
    expect(buildOverall(full().slice(0, 3))).toEqual([]);
  });

  it("gives no overall row when a score is missing, but a real zero counts", () => {
    const rows = full();
    rows[1] = { ...rows[1], score: null };
    expect(buildOverall(rows)).toEqual([]);
    const zero = full();
    zero[1] = { ...zero[1], score: 0 };
    expect(buildOverall(zero)[0].score).toBe(3);
  });

  it("leaves a total missing when any part of it is missing", () => {
    const rows = full();
    rows[2] = { ...rows[2], cost: null, tokens: null };
    const [o] = buildOverall(rows);
    expect(o.cost).toBeNull();
    expect(o.tokens).toBeNull();
    expect(o.timeSeconds).toBe(40);
  });

  it("keeps configurations of one model apart and skips ambiguous duplicates", () => {
    const rows = [...full({ config: "high" }), ...full({ config: "low" })];
    const out = buildOverall(rows);
    expect(out).toHaveLength(2);
    expect(new Set(out.map((o) => o.id)).size).toBe(2);
    const dup = [...full(), r("pdrbench-pro", { id: "dup" })];
    expect(buildOverall(dup)).toEqual([]);
  });
});
