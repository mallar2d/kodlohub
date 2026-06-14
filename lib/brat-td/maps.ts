/**
 * Map configuration and path geometry for Brat TD.
 *
 * Owns the static map catalog (yard, two-way, infinix-junction) and the
 * path lookup / distance-position helpers used by both the engine and the
 * client. Importing this module is a pure config read — no React, no
 * browser-only APIs.
 */

import type { MapConfig, PathPoint, RouteConfig } from "./types";

const easyRoute: PathPoint[] = [
  { x: 0, y: 125 },
  { x: 210, y: 125 },
  { x: 210, y: 300 },
  { x: 420, y: 300 },
  { x: 420, y: 145 },
  { x: 650, y: 145 },
  { x: 650, y: 385 },
  { x: 800, y: 385 },
];

const mediumForwardRoute: PathPoint[] = [
  { x: 0, y: 95 },
  { x: 320, y: 95 },
  { x: 320, y: 215 },
  { x: 115, y: 215 },
  { x: 115, y: 380 },
  { x: 560, y: 380 },
  { x: 560, y: 215 },
  { x: 800, y: 215 },
];

const hardRoutes: RouteConfig[] = [
  { id: "north_left", name: "North -> Core L", points: [{ x: 390, y: 0 }, { x: 390, y: 100 }, { x: 245, y: 100 }, { x: 245, y: 235 }, { x: 90, y: 235 }, { x: 90, y: 500 }] },
  { id: "west_right", name: "West -> Core R", points: [{ x: 0, y: 250 }, { x: 185, y: 250 }, { x: 185, y: 125 }, { x: 485, y: 125 }, { x: 485, y: 365 }, { x: 710, y: 365 }, { x: 710, y: 500 }] },
  { id: "south_right", name: "South -> Core R", points: [{ x: 430, y: 500 }, { x: 430, y: 385 }, { x: 600, y: 385 }, { x: 600, y: 250 }, { x: 710, y: 250 }, { x: 710, y: 500 }] },
  { id: "north_right", name: "North -> Core R", points: [{ x: 390, y: 0 }, { x: 390, y: 105 }, { x: 590, y: 105 }, { x: 590, y: 250 }, { x: 710, y: 250 }, { x: 710, y: 500 }] },
  { id: "west_left", name: "West -> Core L", points: [{ x: 0, y: 250 }, { x: 185, y: 250 }, { x: 185, y: 370 }, { x: 90, y: 370 }, { x: 90, y: 500 }] },
  { id: "south_left", name: "South -> Core L", points: [{ x: 430, y: 500 }, { x: 430, y: 380 }, { x: 245, y: 380 }, { x: 245, y: 235 }, { x: 90, y: 235 }, { x: 90, y: 500 }] },
];

export const MAP_CONFIGS: MapConfig[] = [
  {
    id: "yard",
    name: "Коростишівський Двір",
    difficultyLabel: "Easy route",
    description: "Одна довга дорога, багато місця під башти і чесні choke points для першого проходження.",
    routes: [{ id: "main", name: "Двір -> Core", points: easyRoute }],
    gates: [
      { x: easyRoute[0].x + 18, y: easyRoute[0].y, label: "ENTRY", color: "#22c55e" },
      { x: easyRoute[easyRoute.length - 1].x - 18, y: easyRoute[easyRoute.length - 1].y, label: "CORE", color: "#38bdf8", isExit: true },
    ],
    obstacles: [
      { x: 315, y: 195, radius: 32, name: "Коростишівський Граніт", emoji: "", color: "#4b5563", borderColor: "#374151" },
      { x: 535, y: 305, radius: 30, name: "Озеро Nescafe", emoji: "", color: "#1d4ed8", borderColor: "#1e3a8a" },
      { x: 720, y: 115, radius: 24, name: "Зламаний Infinix", emoji: "", color: "#6b21a8", borderColor: "#581c87" },
    ],
    decor: [
      { x: 72, y: 314, r: 38, color: "rgba(63, 98, 48, 0.42)" },
      { x: 222, y: 58, r: 28, color: "rgba(69, 58, 39, 0.35)" },
      { x: 382, y: 176, r: 30, color: "rgba(58, 88, 46, 0.36)" },
      { x: 538, y: 334, r: 46, color: "rgba(44, 72, 48, 0.38)" },
      { x: 734, y: 76, r: 34, color: "rgba(65, 54, 43, 0.34)" },
      { x: 718, y: 452, r: 42, color: "rgba(38, 66, 42, 0.36)" },
    ],
    getWaveRoutes: () => ["main"],
  },
  {
    id: "two-way",
    name: "Двосторонній Накат",
    difficultyLabel: "Medium route",
    description: "Одна дорога між двома порталами: спершу A->B, потім реверс, далі хвилі з обох боків.",
    routes: [
      { id: "a_to_b", name: "Gate A -> Gate B", points: mediumForwardRoute },
      { id: "b_to_a", name: "Gate B -> Gate A", points: [...mediumForwardRoute].reverse() },
    ],
    gates: [
      { x: mediumForwardRoute[0].x + 18, y: mediumForwardRoute[0].y, label: "GATE A", color: "#22c55e" },
      { x: mediumForwardRoute[mediumForwardRoute.length - 1].x - 18, y: mediumForwardRoute[mediumForwardRoute.length - 1].y, label: "GATE B", color: "#f59e0b", isExit: true },
    ],
    obstacles: [
      { x: 225, y: 315, radius: 34, name: "Nescafe Crates", emoji: "", color: "#92400e", borderColor: "#451a03" },
      { x: 430, y: 255, radius: 42, name: "Складський Блок", emoji: "", color: "#4b5563", borderColor: "#27272a" },
      { x: 650, y: 120, radius: 28, name: "Озеро Nescafe", emoji: "", color: "#1d4ed8", borderColor: "#1e3a8a" },
    ],
    decor: [
      { x: 155, y: 65, r: 32, color: "rgba(120, 78, 28, 0.32)" },
      { x: 258, y: 440, r: 48, color: "rgba(77, 52, 33, 0.38)" },
      { x: 475, y: 72, r: 40, color: "rgba(65, 54, 43, 0.36)" },
      { x: 690, y: 330, r: 44, color: "rgba(38, 66, 42, 0.28)" },
    ],
    getWaveRoutes: (wave) => {
      if (wave <= 3) return ["a_to_b"];
      if (wave <= 6) return ["b_to_a"];
      if (wave <= 10) return [wave % 2 === 0 ? "a_to_b" : "b_to_a"];
      if (wave <= 20) return wave % 4 === 0 ? ["a_to_b", "b_to_a"] : [wave % 2 === 0 ? "a_to_b" : "b_to_a"];
      return wave % 3 === 0 ? ["a_to_b", "b_to_a"] : [wave % 2 === 0 ? "a_to_b" : "b_to_a"];
    },
  },
  {
    id: "infinix-junction",
    name: "Розв'язка Infinix",
    difficultyLabel: "Hard route",
    description: "Три входи і два виходи. Маршрути поступово міняються, а після середини гри комбінуються.",
    routes: hardRoutes,
    gates: [
      { x: 390, y: 24, label: "NORTH", color: "#22c55e" },
      { x: 24, y: 250, label: "WEST", color: "#22c55e" },
      { x: 430, y: 476, label: "SOUTH", color: "#22c55e" },
      { x: 90, y: 476, label: "CORE L", color: "#38bdf8", isExit: true },
      { x: 710, y: 476, label: "CORE R", color: "#38bdf8", isExit: true },
    ],
    obstacles: [
      { x: 345, y: 245, radius: 38, name: "Зламаний Infinix", emoji: "", color: "#6b21a8", borderColor: "#581c87" },
      { x: 540, y: 235, radius: 30, name: "Електрощит", emoji: "", color: "#0ea5e9", borderColor: "#075985" },
      { x: 235, y: 305, radius: 28, name: "Кабельна Котушка", emoji: "", color: "#4b5563", borderColor: "#1f2937" },
      { x: 640, y: 100, radius: 26, name: "Коростишівський Граніт", emoji: "", color: "#4b5563", borderColor: "#374151" },
    ],
    decor: [
      { x: 115, y: 112, r: 34, color: "rgba(59, 130, 246, 0.16)" },
      { x: 298, y: 438, r: 42, color: "rgba(168, 85, 247, 0.16)" },
      { x: 505, y: 55, r: 36, color: "rgba(34, 197, 94, 0.13)" },
      { x: 690, y: 315, r: 48, color: "rgba(6, 182, 212, 0.14)" },
    ],
    getWaveRoutes: (wave) => {
      if (wave <= 4) return ["north_left"];
      if (wave <= 8) return ["west_right"];
      if (wave <= 12) return ["south_right"];
      if (wave <= 20) return wave % 2 === 0 ? ["north_left", "south_right"] : ["west_left"];
      if (wave <= 35) return wave % 3 === 0 ? ["north_right", "west_left"] : ["south_left", "west_right"];
      return wave % 5 === 0 ? ["north_left", "west_right", "south_left"] : ["north_right", "south_right"];
    },
  },
];

export const DEFAULT_MAP_ID = MAP_CONFIGS[0].id;

export function getMapById(mapId: string): MapConfig {
  return MAP_CONFIGS.find((map) => map.id === mapId) ?? MAP_CONFIGS[0];
}

export function getRouteById(map: MapConfig, routeId: string): RouteConfig {
  return map.routes.find((route) => route.id === routeId) ?? map.routes[0];
}

export function getWaveRouteIds(map: MapConfig, waveNumber: number): string[] {
  const routeIds = map
    .getWaveRoutes(waveNumber)
    .filter((routeId) => map.routes.some((route) => route.id === routeId));
  return routeIds.length > 0 ? routeIds : [map.routes[0].id];
}

/**
 * Walks a polyline accumulating segment lengths until it has covered
 * `distance` units of travel. Returns the (x,y) world coordinates the
 * enemy should be drawn at and the index of the next waypoint.
 */
export function getRouteDistancePosition(
  points: PathPoint[],
  distance: number
): { x: number; y: number; pathIndex: number } {
  let remainingDist = Math.max(0, distance);
  let currentX = points[0].x;
  let currentY = points[0].y;
  let newPathIndex = 1;

  for (let p = 0; p < points.length - 1; p++) {
    const p1 = points[p];
    const p2 = points[p + 1];
    const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (remainingDist <= segLen) {
      const t = segLen > 0 ? remainingDist / segLen : 0;
      currentX = p1.x + (p2.x - p1.x) * t;
      currentY = p1.y + (p2.y - p1.y) * t;
      newPathIndex = p + 1;
      break;
    }
    remainingDist -= segLen;
    currentX = p2.x;
    currentY = p2.y;
    newPathIndex = p + 2;
  }

  if (newPathIndex >= points.length) {
    newPathIndex = points.length - 1;
    currentX = points[points.length - 1].x;
    currentY = points[points.length - 1].y;
  }

  return { x: currentX, y: currentY, pathIndex: newPathIndex };
}

/**
 * Per-frame random helpers. Kept as named functions so they can be
 * stubbed in tests (and the react-hooks/purity lint rule stays happy).
 */
export const getPureRandom = () => Math.random();
export const getPureId = () => Math.random().toString(36).substr(2, 9);

/** Euclidean distance between two world points. */
export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

/** Distance from a point to a line segment. */
export function getDistanceToSegment(p: PathPoint, a: PathPoint, b: PathPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return getDistance(p.x, p.y, a.x, a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return getDistance(p.x, p.y, a.x + t * dx, a.y + t * dy);
}

/** True when (x,y) is within `radius` of any route segment on the active map. */
export function isPositionOnPath(
  x: number,
  y: number,
  map: MapConfig,
  radius = 24
): boolean {
  for (const route of map.routes) {
    for (let i = 0; i < route.points.length - 1; i++) {
      const dist = getDistanceToSegment({ x, y }, route.points[i], route.points[i + 1]);
      if (dist < radius) return true;
    }
  }
  return false;
}
