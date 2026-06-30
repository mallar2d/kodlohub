import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  HELPERS,
  PRESTIGE_THRESHOLD,
  formatGrams,
  getHelperCost,
  getRespectGain,
} from "../gameConfig";
import {
  applyClick,
  applyNewAchievements,
  applyOfflineProgress,
  buyHelper,
  buyUpgrade,
  canPrestige,
  computeBaseGps,
  computeClickPower,
  createInitialState,
  doPrestige,
  getHelperPrice,
  isUpgradeVisible,
  normalizeState,
  tick,
} from "../state";

describe("gameConfig", () => {
  it("helper costs grow geometrically and are always integers", () => {
    const helper = HELPERS[0];
    const cost0 = getHelperCost(helper, 0);
    const cost1 = getHelperCost(helper, 1);
    expect(cost0).toBe(helper.baseCost);
    expect(cost1).toBeGreaterThan(cost0);
    expect(Number.isInteger(cost1)).toBe(true);
  });

  it("every helper has a positive base cost and production", () => {
    for (const helper of HELPERS) {
      expect(helper.baseCost).toBeGreaterThan(0);
      expect(helper.baseGps).toBeGreaterThan(0);
    }
  });

  it("formats large numbers with Ukrainian suffixes", () => {
    expect(formatGrams(999)).toBe("999");
    expect(formatGrams(1_500)).toBe("1.5К");
    expect(formatGrams(2_000_000)).toBe("2.0М");
    expect(formatGrams(3_000_000_000)).toBe("3.0Б");
  });

  it("grants no respect below the prestige threshold", () => {
    expect(getRespectGain(PRESTIGE_THRESHOLD - 1)).toBe(0);
    expect(getRespectGain(PRESTIGE_THRESHOLD)).toBeGreaterThan(0);
  });
});

describe("clicker state", () => {
  it("starts at zero with no helpers", () => {
    const state = createInitialState(1000);
    expect(state.grams).toBe(0);
    expect(computeBaseGps(state)).toBe(0);
    expect(computeClickPower(state)).toBe(1);
  });

  it("clicking outside the 22:00 window awards base click power", () => {
    const state = createInitialState();
    const noon = new Date(2024, 0, 1, 12, 0, 0);
    const { state: next, gained, isSpecial } = applyClick(state, noon, () => 0.99);
    expect(isSpecial).toBe(false);
    expect(gained).toBe(1);
    expect(next.grams).toBe(1);
    expect(next.totalClicks).toBe(1);
  });

  it("applies the x22 bonus exactly at 22:00 local hour", () => {
    const state = createInitialState();
    const podroHour = new Date(2024, 0, 1, 22, 30, 0);
    const { gained, isSpecial } = applyClick(state, podroHour, () => 0.99);
    expect(isSpecial).toBe(true);
    expect(gained).toBe(22);
  });

  it("rolls a critical hit when rng is below crit chance", () => {
    const state = createInitialState();
    const noon = new Date(2024, 0, 1, 12, 0, 0);
    const { gained, isCrit } = applyClick(state, noon, () => 0);
    expect(isCrit).toBe(true);
    expect(gained).toBe(22);
  });

  it("buying a helper deducts cost and increases gps", () => {
    let state = createInitialState();
    state = { ...state, grams: 1000 };
    const before = computeBaseGps(state);
    const bought = buyHelper(state, "shemetovany");
    expect(bought).not.toBeNull();
    expect(bought!.grams).toBeLessThan(1000);
    expect(computeBaseGps(bought!)).toBeGreaterThan(before);
  });

  it("refuses to buy a helper without enough grams", () => {
    const state = createInitialState();
    expect(buyHelper(state, "shemetovany")).toBeNull();
  });

  it("hides building upgrades until the ownership requirement is met", () => {
    let state = createInitialState();
    state = { ...state, grams: 100_000, helpers: { kodlo: 1 } };
    expect(isUpgradeVisible(state, "u_b_kodlo")).toBe(false);
    state = { ...state, helpers: { kodlo: 5 } };
    expect(isUpgradeVisible(state, "u_b_kodlo")).toBe(true);
  });

  it("buying a building upgrade doubles that helper's production only", () => {
    let state = createInitialState();
    state = { ...state, grams: 1_000_000, helpers: { shemetovany: 1, kodlo: 0 } };
    const before = computeBaseGps(state);
    const after = buyUpgrade(state, "u_b_shemetovany");
    expect(after).not.toBeNull();
    expect(computeBaseGps(after!)).toBeCloseTo(before * 2, 5);
  });

  it("ticking accumulates gps over time", () => {
    let state = createInitialState(0);
    state = { ...state, helpers: { shemetovany: 10 } }; // 1 g/s base
    const noon = new Date(2024, 0, 1, 12, 0, 0);
    const { gained, state: next } = tick(state, 5000, noon);
    expect(gained).toBeCloseTo(5, 5);
    expect(next.grams).toBeCloseTo(5, 5);
  });

  it("caps offline progress and applies the offline efficiency penalty", () => {
    let state = createInitialState(0);
    state = { ...state, helpers: { shemetovany: 10 }, lastTickAt: 0 }; // 1 g/s base
    const farFuture = 100 * 60 * 60 * 1000; // 100h, way beyond the 8h cap
    const { gained, cappedMs } = applyOfflineProgress(state, farFuture);
    expect(cappedMs).toBe(8 * 60 * 60 * 1000);
    expect(gained).toBeCloseTo(8 * 60 * 60 * 0.5, 1);
  });

  it("unlocks achievements once career grams cross their threshold", () => {
    let state = createInitialState();
    state = { ...state, careerGrams: 50 };
    const next = applyNewAchievements(state);
    expect(next.achievements).toContain("a_first_spoon");
    expect(next.achievements).not.toContain(ACHIEVEMENTS[ACHIEVEMENTS.length - 1].id);
  });

  it("prestige resets the run but keeps career stats and grants respect", () => {
    let state = createInitialState();
    state = {
      ...state,
      grams: 500,
      careerGrams: PRESTIGE_THRESHOLD,
      helpers: { shemetovany: 5 },
      upgrades: ["u_spoon"],
    };
    expect(canPrestige(state)).toBe(true);
    const next = doPrestige(state, 12345);
    expect(next.grams).toBe(0);
    expect(next.helpers).toEqual({});
    expect(next.upgrades).toEqual([]);
    expect(next.careerGrams).toBe(PRESTIGE_THRESHOLD);
    expect(next.respectPoints).toBeGreaterThan(0);
    expect(next.prestigeCount).toBe(1);
    expect(next.lastTickAt).toBe(12345);
  });

  it("does nothing when prestiging below the threshold", () => {
    const state = createInitialState();
    expect(canPrestige(state)).toBe(false);
    expect(doPrestige(state)).toBe(state);
  });

  it("respect points permanently boost production after prestige", () => {
    let state = createInitialState();
    state = { ...state, careerGrams: PRESTIGE_THRESHOLD, helpers: { shemetovany: 10 } };
    const gpsBefore = computeBaseGps(state);
    const prestiged = doPrestige(state);
    const reseeded = { ...prestiged, helpers: { shemetovany: 10 } };
    expect(computeBaseGps(reseeded)).toBeGreaterThan(gpsBefore);
  });

  it("normalizeState sanitizes garbage input into a safe default state", () => {
    const result = normalizeState({ grams: "lots", helpers: { shemetovany: -5 }, upgrades: ["nope"] });
    expect(result.grams).toBe(0);
    expect(result.helpers.shemetovany).toBeUndefined();
    expect(result.upgrades).toEqual([]);
  });

  it("normalizeState passes through valid data", () => {
    const result = normalizeState({
      grams: 42,
      careerGrams: 100,
      totalClicks: 3,
      helpers: { shemetovany: 2 },
      upgrades: ["u_spoon"],
      achievements: ["a_first_spoon"],
      respectPoints: 5,
      prestigeCount: 1,
      lastTickAt: 999,
    });
    expect(result.grams).toBe(42);
    expect(result.helpers.shemetovany).toBe(2);
    expect(result.upgrades).toEqual(["u_spoon"]);
    expect(result.respectPoints).toBe(5);
  });

  it("getHelperPrice matches getHelperCost for the current owned count", () => {
    let state = createInitialState();
    state = { ...state, helpers: { kodlo: 3 }, grams: 1_000_000 };
    const helper = HELPERS.find((h) => h.id === "kodlo")!;
    expect(getHelperPrice(state, "kodlo")).toBe(getHelperCost(helper, 3));
  });
});
