/**
 * Greedy placement of point labels so they do not overlap each other or other points.
 * Pure geometry: the chart passes pixel positions, this returns where each label goes.
 */
export interface LabelInput {
  id: string;
  /** Pixel position of the point centre. */
  x: number;
  y: number;
  text: string;
  /** Marker radius. */
  r: number;
}

export interface PlacedLabel {
  id: string;
  x: number;
  y: number;
  anchor: "start" | "end" | "middle";
}

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const LABEL_CHAR_WIDTH = 6.1;
export const LABEL_HEIGHT = 12;
const GAP = 6;

interface Rect {
  l: number;
  t: number;
  r: number;
  b: number;
}

const hit = (a: Rect, b: Rect) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

/**
 * `inputs` must be ordered by priority: earlier labels win a contested spot, later ones try other
 * sides and are dropped when nothing fits. Every point is an obstacle, drawn or not.
 */
export function placeLabels(inputs: readonly LabelInput[], bounds: Bounds): Map<string, PlacedLabel> {
  const placed = new Map<string, PlacedLabel>();
  const taken: Rect[] = [];
  const markers: Rect[] = inputs.map((p) => ({ l: p.x - p.r - 1, t: p.y - p.r - 1, r: p.x + p.r + 1, b: p.y + p.r + 1 }));

  for (const p of inputs) {
    const w = p.text.length * LABEL_CHAR_WIDTH;
    const candidates: PlacedLabel[] = [
      { id: p.id, x: p.x + p.r + GAP, y: p.y + 4, anchor: "start" },
      { id: p.id, x: p.x - p.r - GAP, y: p.y + 4, anchor: "end" },
      { id: p.id, x: p.x, y: p.y - p.r - GAP, anchor: "middle" },
      { id: p.id, x: p.x, y: p.y + p.r + GAP + LABEL_HEIGHT - 2, anchor: "middle" },
      // Corners: a point against an edge of the plot still gets its name, set diagonally.
      { id: p.id, x: p.x - p.r, y: p.y + p.r + GAP + LABEL_HEIGHT - 2, anchor: "end" },
      { id: p.id, x: p.x + p.r, y: p.y + p.r + GAP + LABEL_HEIGHT - 2, anchor: "start" },
      { id: p.id, x: p.x - p.r, y: p.y - p.r - GAP, anchor: "end" },
      { id: p.id, x: p.x + p.r, y: p.y - p.r - GAP, anchor: "start" },
    ];
    for (const c of candidates) {
      const l = c.anchor === "start" ? c.x : c.anchor === "end" ? c.x - w : c.x - w / 2;
      const rect: Rect = { l, t: c.y - LABEL_HEIGHT + 2, r: l + w, b: c.y + 3 };
      if (rect.l < bounds.left || rect.r > bounds.right || rect.t < bounds.top || rect.b > bounds.bottom) continue;
      if (taken.some((t) => hit(rect, t))) continue;
      if (markers.some((m) => hit(rect, m))) continue;
      placed.set(p.id, c);
      taken.push(rect);
      break;
    }
  }
  return placed;
}
