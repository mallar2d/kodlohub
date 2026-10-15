import { afterEach, describe, expect, it, vi } from "vitest";
import { loadKodloBench } from "../source";

afterEach(() => vi.unstubAllEnvs());

describe("loadKodloBench", () => {
  it("starts empty: no results are published yet", async () => {
    const res = await loadKodloBench();
    expect(res).toMatchObject({ status: "ok", results: [], synthetic: false });
  });

  it("serves synthetic data only in development with the explicit flag", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("KODLOBENCH_SYNTHETIC", "1");
    const dev = await loadKodloBench();
    expect(dev.status === "ok" && dev.synthetic && dev.results.length > 0).toBe(true);
    expect(dev.status === "ok" && dev.results.every((r) => r.id.startsWith("synthetic-"))).toBe(true);
  });

  it("never serves synthetic data in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("KODLOBENCH_SYNTHETIC", "1");
    const prod = await loadKodloBench();
    expect(prod).toMatchObject({ status: "ok", synthetic: false, results: [] });
  });
});
