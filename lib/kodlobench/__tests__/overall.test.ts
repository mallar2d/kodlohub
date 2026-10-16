import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../categories";
import { formatScore } from "../format";
import { buildOverall, overallBothModes } from "../overall";
import type { PublishedResult } from "../types";

function r(category: string, over: Partial<PublishedResult> = {}): PublishedResult {
  return {
    id: `${category}-${over.config ?? "default"}-${over.model ?? "M"}`, category, model: "M", agent: "A", config: "default",
    status: null, score: 100, timeSeconds: 10, tokens: 1000, cost: 1, publishedAt: null, metrics: [], notes: null, alert: null, media: [], ...over,
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

  it("shows a failed test as an overall row without a total, never as a zero", () => {
    const rows = full();
    rows[1] = { ...rows[1], score: null, status: "failed" };
    rows[2] = { ...rows[2], score: null, status: "failed" };
    const [o] = buildOverall(rows);
    expect(o).toMatchObject({ score: null, status: "failed" });
    expect(o.metrics.map((m) => m.value)).toEqual([100, "Не пройдено", "Не пройдено", 100]);
  });

  it("still skips a configuration with a plain gap even if other tests failed", () => {
    const rows = full().slice(0, 3);
    rows[1] = { ...rows[1], score: null, status: "failed" };
    expect(buildOverall(rows)).toEqual([]);
  });

  it("surfaces a component warning on the overall row, naming its category", () => {
    const rows = full();
    rows[1] = { ...rows[1], alert: "Ліміт часу" };
    expect(buildOverall(rows)[0].alert).toBe(`${CATEGORIES[1].name}: Ліміт часу`);
    expect(buildOverall(full())[0].alert).toBeNull();
  });

  describe("without a category", () => {
    const scores = [100, 200, 300, 400]; // PDRBench-Pro first
    const rows = CATEGORIES.map((c, i) => r(c.id, { score: scores[i], timeSeconds: 10 * (i + 1), tokens: 1000 * (i + 1), cost: i + 1 }));

    it("scales the remaining three to the same maximum of 22,00", () => {
      const full = CATEGORIES.map((c) => r(c.id, { score: 550 }));
      const [o] = buildOverall(full, { exclude: ["pdrbench-pro"] });
      expect(o.score).toBe(22);
      expect(formatScore(o.score, o.category)).toBe("22,00");
    });

    it("sums only the counted categories, times 4/3", () => {
      const [o] = buildOverall(rows, { exclude: ["pdrbench-pro"] });
      // (200 + 300 + 400) * 4/3 / 100 = 12
      expect(o.score).toBe(12);
    });

    it("leaves time, tokens and cost of the left-out category out of the totals", () => {
      const [o] = buildOverall(rows, { exclude: ["pdrbench-pro"] });
      expect(o).toMatchObject({ timeSeconds: 90, tokens: 9000, cost: 9 });
    });

    it("keeps the left-out category visible among the components, marked as not counted", () => {
      const [o] = buildOverall(rows, { exclude: ["pdrbench-pro"] });
      expect(o.metrics[0]).toEqual({ label: CATEGORIES[0].name, value: "100 (не враховано)" });
      expect(o.metrics[1].value).toBe(200);
    });

    it("includes configurations that lack the left-out category and skips them otherwise", () => {
      const noPdr = rows.slice(1);
      expect(buildOverall(noPdr)).toEqual([]);
      expect(buildOverall(noPdr, { exclude: ["pdrbench-pro"] })).toHaveLength(1);
    });

    it("ignores a warning on the left-out category", () => {
      const withAlert = rows.map((x, i) => (i === 0 ? { ...x, alert: "Ліміт часу" } : x));
      expect(buildOverall(withAlert, { exclude: ["pdrbench-pro"] })[0].alert).toBeNull();
      expect(buildOverall(withAlert)[0].alert).toBe(`${CATEGORIES[0].name}: Ліміт часу`);
    });

    it("never leaves zero categories", () => {
      const all = CATEGORIES.map((c) => c.id);
      expect(buildOverall(rows, { exclude: all })).toHaveLength(1);
      expect(buildOverall(rows, { exclude: all })[0].score).toBe(10);
    });
  });

  describe("overallBothModes", () => {
    const scores = [100, 200, 300, 400];
    const rows = CATEGORIES.map((c, i) => r(c.id, { score: scores[i] }));

    it("pairs the score with and without the category for the same row", () => {
      const [pair] = [...overallBothModes(rows, "pdrbench-pro").values()];
      expect(pair.with).toBe(10);
      expect(pair.without).toBe(12);
    });

    it("keeps a missing side as null", () => {
      const noPdr = rows.slice(1);
      const [pair] = [...overallBothModes(noPdr, "pdrbench-pro").values()];
      expect(pair).toEqual({ with: null, without: 12 });
    });
  });
});
