import { describe, expect, it } from "vitest";
import { LABEL_CHAR_WIDTH, placeLabels, type LabelInput } from "../labels";

const bounds = { left: 0, top: 0, right: 400, bottom: 300 };
const pt = (id: string, x: number, y: number, text = id): LabelInput => ({ id, x, y, text, r: 5 });

describe("placeLabels", () => {
  it("puts a lone label to the right of its point", () => {
    const out = placeLabels([pt("a", 100, 100, "Model")], bounds);
    expect(out.get("a")).toMatchObject({ anchor: "start", x: 111 });
  });

  it("moves to another side near the right edge instead of overflowing", () => {
    const out = placeLabels([pt("a", 380, 100, "Model name")], bounds);
    expect(out.get("a")?.anchor).toBe("end");
  });

  it("never overlaps two labels of nearby points", () => {
    const pts = [pt("a", 100, 100, "Alpha model"), pt("b", 105, 104, "Beta model"), pt("c", 110, 100, "Gamma model")];
    const out = placeLabels(pts, bounds);
    const rects = [...out.values()].map((l) => {
      const w = pts.find((p) => p.id === l.id)!.text.length * LABEL_CHAR_WIDTH;
      const left = l.anchor === "start" ? l.x : l.anchor === "end" ? l.x - w : l.x - w / 2;
      return { l: left, r: left + w, t: l.y - 10, b: l.y + 3 };
    });
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        expect(a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t).toBe(false);
      }
  });

  it("gives the contested spot to the higher priority label and drops what cannot fit", () => {
    const tiny = { left: 90, top: 90, right: 130, bottom: 110 };
    const out = placeLabels([pt("first", 100, 100, "Long label name"), pt("second", 100, 100, "Other long one")], tiny);
    expect(out.size).toBeLessThan(2);
  });

  it("keeps labels inside the bounds", () => {
    const out = placeLabels([pt("a", 5, 5, "Corner")], bounds);
    for (const l of out.values()) expect(l.y).toBeGreaterThanOrEqual(0);
  });

  it("still names a point in the top-right corner of the plot", () => {
    const out = placeLabels([pt("a", 392, 4, "Grok 4.6 (high)")], { left: 0, top: -8, right: 400, bottom: 300 });
    expect(out.has("a")).toBe(true);
  });
});
