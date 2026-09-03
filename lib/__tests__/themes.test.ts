import { describe, it, expect } from "vitest";
import { THEMES, DEFAULT_THEME_ID, getThemeConfig, ThemeId } from "../themes";

describe("KodloHUB Themes System", () => {
  it("should define default theme as 'space' and include it in THEMES", () => {
    expect(DEFAULT_THEME_ID).toBe("space");
    const defaultTheme = THEMES.find((t) => t.id === DEFAULT_THEME_ID);
    expect(defaultTheme).toBeDefined();
    expect(defaultTheme?.name).toBe("КОСМІЧНА");
  });

  it("should contain all 7 planned themes with unique IDs", () => {
    const ids = THEMES.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(7);
    expect(uniqueIds.size).toBe(7);

    const expectedIds: ThemeId[] = [
      "space",
      "nescafe",
      "kodlorune",
      "matrix",
      "atb",
      "biohazard",
      "sadochok",
    ];
    for (const expected of expectedIds) {
      expect(uniqueIds.has(expected)).toBe(true);
    }
  });

  it("should have valid metadata, hex colors, and non-empty strings for all themes", () => {
    const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

    for (const theme of THEMES) {
      expect(theme.name.trim().length).toBeGreaterThan(0);
      expect(theme.badge.trim().length).toBeGreaterThan(0);
      expect(theme.tagline.trim().length).toBeGreaterThan(0);
      expect(theme.description.trim().length).toBeGreaterThan(0);

      expect(theme.accent).toMatch(hexRegex);
      expect(theme.accentHover).toMatch(hexRegex);
      expect(theme.canvas).toMatch(hexRegex);
      expect(theme.canvasSoft).toMatch(hexRegex);
      expect(theme.card).toMatch(hexRegex);
      expect(theme.hairline).toMatch(hexRegex);
      expect(theme.textPrimary).toMatch(hexRegex);
    }
  });

  it("should correctly identify light theme (sadochok)", () => {
    const sadochok = THEMES.find((t) => t.id === "sadochok");
    expect(sadochok).toBeDefined();
    expect(sadochok?.isLight).toBe(true);

    const space = THEMES.find((t) => t.id === "space");
    expect(space?.isLight).toBeFalsy();
  });

  it("should get theme config by ID", () => {
    const nescafe = getThemeConfig("nescafe");
    expect(nescafe.id).toBe("nescafe");
    expect(nescafe.name).toBe("NESCAFE GOLD");
    expect(nescafe.accent).toBe("#f59e0b");

    const matrix = getThemeConfig("matrix");
    expect(matrix.id).toBe("matrix");
    expect(matrix.accent).toBe("#00ff66");

    const atb = getThemeConfig("atb");
    expect(atb.id).toBe("atb");
    expect(atb.accent).toBe("#facc15");

    const biohazard = getThemeConfig("biohazard");
    expect(biohazard.id).toBe("biohazard");
    expect(biohazard.accent).toBe("#bef264");
  });

  it("should fallback to default theme for unknown or empty IDs", () => {
    const fallbackNull = getThemeConfig(null);
    expect(fallbackNull.id).toBe(DEFAULT_THEME_ID);

    const fallbackUndefined = getThemeConfig(undefined);
    expect(fallbackUndefined.id).toBe(DEFAULT_THEME_ID);

    const fallbackInvalid = getThemeConfig("invalid-theme-xyz");
    expect(fallbackInvalid.id).toBe(DEFAULT_THEME_ID);
  });

  it("should have valid audio paths for themes that specify sounds", () => {
    for (const theme of THEMES) {
      if (theme.sound) {
        expect(theme.sound.startsWith("/")).toBe(true);
        expect(theme.sound.endsWith(".mp3")).toBe(true);
      }
    }

    const atb = getThemeConfig("atb");
    expect(atb.sound).toBe("/brat-td/sfx_bankomat_mone.mp3");

    const biohazard = getThemeConfig("biohazard");
    expect(biohazard.sound).toBe("/brat-td/sfx_gas_spray.mp3");

    const sadochok = getThemeConfig("sadochok");
    expect(sadochok.sound).toBe("/PDR_PRODUCTION_SOUND.mp3");
  });
});
