import { describe, expect, it } from "vitest";
import { parsePublishedFile, parseResult } from "../validate";

const base = { id: "a-1", category: "pdrbench-pro", model: "M", agent: "A", config: "high", score: 1, timeSeconds: 2, tokens: 3, cost: 0.5 };
const file = (results: unknown[], extra: object = {}) => ({ schemaVersion: 1, updatedAt: null, currency: "USD", results, ...extra });

describe("parseResult", () => {
  it("keeps a real zero distinct from a missing value", () => {
    const r = parseResult({ ...base, score: 0, tokens: undefined, cost: null });
    expect(r?.score).toBe(0);
    expect(r?.tokens).toBeNull();
    expect(r?.cost).toBeNull();
  });

  it("drops unknown fields (allow-list)", () => {
    const r = parseResult({ ...base, secretKey: "x", rubric: { a: 1 }, prompt: "p" }) as unknown as Record<string, unknown>;
    expect(r).not.toBeNull();
    expect(Object.keys(r).sort()).toEqual(
      ["agent", "category", "config", "cost", "id", "media", "metrics", "model", "notes", "publishedAt", "score", "timeSeconds", "tokens"].sort(),
    );
  });

  it("rejects bad shapes", () => {
    expect(parseResult({ ...base, category: "overall" })).toBeNull();
    expect(parseResult({ ...base, id: "Bad Id" })).toBeNull();
    expect(parseResult({ ...base, score: "10" })).toBeNull();
    expect(parseResult({ ...base, score: Number.NaN })).toBeNull();
    expect(parseResult({ ...base, tokens: 1.5 })).toBeNull();
    expect(parseResult({ ...base, cost: -1 })).toBeNull();
    expect(parseResult({ ...base, model: "  " })).toBeNull();
    expect(parseResult(null)).toBeNull();
  });

  it("accepts only https media", () => {
    const ok = parseResult({ ...base, media: [{ kind: "image", url: "https://x.test/a.png", alt: "a" }] });
    expect(ok?.media).toHaveLength(1);
    expect(parseResult({ ...base, media: [{ kind: "image", url: "http://x.test/a.png" }] })).toBeNull();
    expect(parseResult({ ...base, media: [{ kind: "link", url: "javascript:alert(1)" }] })).toBeNull();
  });

  it("refuses synthetic ids unless explicitly allowed", () => {
    expect(parseResult({ ...base, id: "synthetic-1" })).toBeNull();
    expect(parseResult({ ...base, id: "synthetic-1" }, { allowSynthetic: true })).not.toBeNull();
  });
});

describe("parsePublishedFile", () => {
  it("accepts the empty initial state", () => {
    const p = parsePublishedFile({ schemaVersion: 1, updatedAt: null, currency: null, results: [] });
    expect(p).toMatchObject({ ok: true, results: [], rejected: 0 });
  });

  it("counts rejected and duplicate records instead of failing the file", () => {
    const p = parsePublishedFile(file([base, base, { ...base, id: "b", category: "nope" }, { ...base, id: "c" }]));
    expect(p.ok && p.results.map((r) => r.id)).toEqual(["a-1", "c"]);
    expect(p.ok && p.rejected).toBe(2);
  });

  it("fails on a bad envelope", () => {
    expect(parsePublishedFile(null).ok).toBe(false);
    expect(parsePublishedFile({ schemaVersion: 2, results: [] }).ok).toBe(false);
    expect(parsePublishedFile({ schemaVersion: 1 }).ok).toBe(false);
    expect(parsePublishedFile(file([], { currency: "usd" })).ok).toBe(false);
  });

  it("requires a currency when any cost is present", () => {
    expect(parsePublishedFile(file([base], { currency: null })).ok).toBe(false);
    expect(parsePublishedFile(file([{ ...base, cost: null }], { currency: null })).ok).toBe(true);
  });
});
