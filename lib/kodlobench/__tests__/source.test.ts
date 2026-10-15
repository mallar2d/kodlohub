import { afterEach, describe, expect, it, vi } from "vitest";
import { loadKodloBench } from "../source";

afterEach(() => vi.unstubAllEnvs());

describe("loadKodloBench", () => {
  it("loads the published file without rejecting any record", async () => {
    const res = await loadKodloBench();
    expect(res).toMatchObject({ status: "ok", synthetic: false, rejected: 0 });
    expect(res.status === "ok" && res.results.every((r) => !r.id.startsWith("synthetic-"))).toBe(true);
  });

  it("serves synthetic data only in development with the explicit flag", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("KODLOBENCH_SYNTHETIC", "1");
    const dev = await loadKodloBench();
    expect(dev.status === "ok" && dev.synthetic && dev.results.length > 0).toBe(true);
    expect(
      dev.status === "ok" &&
        dev.results.filter((r) => r.category !== "overall").every((r) => r.id.startsWith("synthetic-")),
    ).toBe(true);
    // Overall rows are derived on the server from the four categories.
    expect(dev.status === "ok" && dev.results.some((r) => r.category === "overall")).toBe(true);
  });

  it("never serves synthetic data in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("KODLOBENCH_SYNTHETIC", "1");
    const prod = await loadKodloBench();
    expect(prod).toMatchObject({ status: "ok", synthetic: false });
    expect(prod.status === "ok" && prod.results.every((r) => !r.id.startsWith("synthetic-"))).toBe(true);
  });

  it("derives the overall row for a configuration published in all four categories", async () => {
    const res = await loadKodloBench();
    if (res.status !== "ok") throw new Error("load failed");
    const overall = res.results.filter((r) => r.category === "overall");
    const published = res.results.filter((r) => r.category !== "overall");
    expect(overall.length).toBeGreaterThan(0);
    // Every overall row is backed by exactly four published records.
    for (const o of overall) {
      const parts = published.filter((r) => r.model === o.model && r.agent === o.agent && r.config === o.config);
      expect(parts).toHaveLength(4);
      expect(o.score).toBeCloseTo(parts.reduce((s, r) => s + (r.score ?? 0), 0) / 100, 6);
    }
  });
});
