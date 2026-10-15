import { describe, expect, it } from "vitest";
import type { PublishedResult } from "../types";
import { DEFAULT_VIEW, MAX_SELECTED, parseView, scatterSplit, serializeView, sortResults, toggleSlot, visibleResults } from "../view";

function r(id: string, over: Partial<PublishedResult> = {}): PublishedResult {
  return {
    id, category: "pdrbench-pro", model: id.toUpperCase(), agent: "cli", config: "default",
    score: 1, timeSeconds: 1, tokens: 1, cost: 1, publishedAt: null, metrics: [], notes: null, media: [], ...over,
  };
}

describe("toggleSlot", () => {
  it("keeps colours stable when an entry is removed", () => {
    let s: (string | null)[] = [];
    for (const id of ["a", "b", "c"]) s = toggleSlot(s, id).slots;
    s = toggleSlot(s, "b").slots;
    expect(s).toEqual(["a", null, "c"]);
    expect(toggleSlot(s, "d").slots).toEqual(["a", "d", "c"]);
  });

  it("refuses a ninth entry", () => {
    let s: (string | null)[] = [];
    for (let i = 0; i < MAX_SELECTED; i++) s = toggleSlot(s, `id${i}`).slots;
    const res = toggleSlot(s, "extra");
    expect(res.full).toBe(true);
    expect(res.slots).toEqual(s);
  });
});

describe("sortResults", () => {
  it("puts missing values last in both directions and keeps real zero", () => {
    const rows = [r("a", { score: null }), r("b", { score: 0 }), r("c", { score: 5 })];
    expect(sortResults(rows, "score", "desc").map((x) => x.id)).toEqual(["c", "b", "a"]);
    expect(sortResults(rows, "score", "asc").map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
});

describe("visibleResults", () => {
  const all = [r("a"), r("b", { model: "Other" }), r("c", { category: "redotui-bench" })];
  const base = { ...DEFAULT_VIEW, category: "pdrbench-pro" };
  it("scopes to the category and filters", () => {
    expect(visibleResults(all, base).map((x) => x.id)).toEqual(["a", "b"]);
    expect(visibleResults(all, { ...base, models: ["Other"] }).map((x) => x.id)).toEqual(["b"]);
    expect(visibleResults(all, { ...base, query: "oth" }).map((x) => x.id)).toEqual(["b"]);
  });
  it("never hides a selected entry behind a filter", () => {
    expect(visibleResults(all, { ...base, models: ["Other"], slots: ["a"] }).map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("only-selected narrows to the selection", () => {
    expect(visibleResults(all, { ...base, slots: ["a"], onlySelected: true }).map((x) => x.id)).toEqual(["a"]);
  });
});

describe("scatterSplit", () => {
  it("counts entries without data instead of plotting them as zero", () => {
    const rows = [r("a"), r("b", { cost: null }), r("c", { score: null }), r("d", { cost: 0 })];
    expect(scatterSplit(rows, "cost", false).plotted.map((x) => x.id)).toEqual(["a", "d"]);
    expect(scatterSplit(rows, "cost", false).missing).toBe(2);
    expect(scatterSplit(rows, "cost", true).plotted.map((x) => x.id)).toEqual(["a"]);
  });
});

describe("url state", () => {
  const all = [r("a"), r("b")];
  it("round-trips and drops unknown ids", () => {
    const v = parseView({ category: "pdrbench-pro", sel: "a,,ghost,b", sort: "cost", chart: "time", model: ["X", "Y"], only: "1" }, all);
    expect(v.slots).toEqual(["a", null, null, "b"]);
    expect(v.sort).toBe("cost");
    expect(v.models).toEqual(["X", "Y"]);
    const again = parseView(Object.fromEntries(new URLSearchParams(serializeView(v))), all);
    expect(again.slots).toEqual(v.slots);
    expect(again.chart).toBe("time");
  });
  it("falls back to defaults on garbage", () => {
    const v = parseView({ category: "zzz", sort: "zzz", dir: "x", chart: "zzz", only: "1" }, all);
    expect(v).toMatchObject({ category: "overall", sort: "score", dir: "desc", chart: "bars", onlySelected: false });
  });
  it("keeps the default address clean", () => {
    expect(serializeView(DEFAULT_VIEW)).toBe("");
  });
});
