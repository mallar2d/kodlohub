/**
 * Brat TD canvas renderer — extracted from BratTDClient.tsx (Task 9).
 *
 * Pure-extraction refactor: identical visual output to the previous
 * in-component drawing code. All Canvas 2D drawing functions live here.
 * The orchestration entry point is `renderGame()`, which mirrors the
 * exact per-frame draw order that the original `useEffect` body used.
 *
 * `renderGame()` reads from `RenderContext` (refs, state snapshots,
 * helpers, and the active map/routes/theme) and mutates only the
 * provided ctx. Towers in the towersRef may be mutated in place when
 * the renderer needs to cache a freshly-computed aim angle — this is
 * the same behavior as the previous in-component code.
 *
 * Side effects that were inline in the original render loop:
 *  - Screen-shake decay (mutates the provided shakeRef)
 *  - Steam particles spawned near coffee towers (pushWithCap)
 *  - Wave announcement auto-clear (sets waveAnnouncementRef to null)
 * are reproduced here exactly as before.
 */

import {
  ANTI_AIR_TOWERS,
  ARRAY_CAPS,
  GAME_HEIGHT,
  GAME_WIDTH,
  TOWER_CONFIGS,
} from "@/app/(main)/tools/brat-td/gameConfig";
import type {
  ActiveEnemy,
  FloatingText,
  MapConfig,
  MapGate,
  MapDecorPatch,
  Mine,
  MineProjectile,
  ObstacleConfig,
  Particle,
  PathPoint,
  PlacedTower,
  Projectile,
  RouteConfig,
  SceneTheme,
  SpeedTrail,
} from "@/lib/brat-td/types";

// ─────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────

/** Pure helper: satisfies react-hooks/purity ruleset (Math.random). */
const getPureRandom = () => Math.random();

/** Cap-pushing helper used for steam particles. */
const pushWithCap = <T,>(arr: T[], items: T | T[], cap: number) => {
  const itemList = Array.isArray(items) ? items : [items];
  while (arr.length + itemList.length > cap && arr.length > 0) arr.shift();
  arr.push(...itemList);
};

function colorWithAlpha(color: string, alpha: number) {
  if (!color.startsWith("#") || color.length !== 7) return color;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─────────────────────────────────────────────────────────────────────────
//  Render context — bundles all state/inputs the renderer needs.
// ─────────────────────────────────────────────────────────────────────────

export interface RendererScreenShake {
  intensity: number;
  duration: number;
  x: number;
  y: number;
}

export interface RendererSettings {
  effectLimits: boolean;
}

export interface RenderContext {
  // canvas / theme
  ctx: CanvasRenderingContext2D;
  theme: SceneTheme;
  frame: number;

  // map data
  activeMap: MapConfig;
  activeRouteIds: string[];

  // state refs (read-only / observed; towers may be mutated in place
  // for aim-angle caching, like the original code did)
  towers: PlacedTower[];
  enemies: ActiveEnemy[];
  projectiles: Projectile[];
  mineProjectiles: MineProjectile[];
  mines: Mine[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  speedTrails: SpeedTrail[];
  projectileTrail: { x: number; y: number; size: number; color: string; alpha: number }[];
  explosionRings: {
    x: number;
    y: number;
    color: string;
    radius: number;
    maxRadius: number;
    life: number;
    coreLife: number;
    ringCount: number;
    debris: { x: number; y: number; size: number; color: string; life: number; maxLife: number }[];
  }[];

  // screen shake (mutated in place: intensity decays, x/y updated)
  shake: RendererScreenShake;

  // wave announcement (cleared when expired)
  waveAnnouncement: { wave: number; frameStart: number } | null;
  onClearWaveAnnouncement: () => void;

  // mouse / input
  mousePos: { x: number; y: number };
  isMouseOnCanvas: boolean;
  selectedPlacedTowerId: string | null;
  selectedShopTower: string | null;
  draggedTowerType: string | null;
  draggedTowerPos: { x: number; y: number } | null;
  hoveredShopTower: string | null;

  // lives threshold for "danger" exit gate
  lives: number;

  // settings
  settings: RendererSettings;

  // helpers
  getDistance: (x1: number, y1: number, x2: number, y2: number) => number;
  isPositionOnPath: (x: number, y: number, radius?: number) => boolean;
  isSupportTowerType: (type: string) => boolean;
  getEffectiveTowerRange: (tower: PlacedTower) => number;
  getRouteById: (map: MapConfig, routeId: string) => RouteConfig;
  getWaveRouteIds: (map: MapConfig, wave: number) => string[];
}

// ─────────────────────────────────────────────────────────────────────────
//  Scene / track / gates / obstacles
// ─────────────────────────────────────────────────────────────────────────

function drawSceneBackground(
  ctx: CanvasRenderingContext2D,
  theme: SceneTheme,
  frame: number,
  decor: MapDecorPatch[]
) {
  const sky = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  sky.addColorStop(0, theme.skyTop);
  sky.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const ground = ctx.createRadialGradient(
    GAME_WIDTH * 0.55,
    GAME_HEIGHT * 0.42,
    80,
    GAME_WIDTH * 0.5,
    GAME_HEIGHT * 0.5,
    GAME_WIDTH * 0.82
  );
  ground.addColorStop(0, theme.groundC);
  ground.addColorStop(0.55, theme.groundB);
  ground.addColorStop(1, theme.groundA);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  decor.forEach((patch, index) => {
    const sway = Math.sin(frame * 0.01 + index) * 2;
    ctx.fillStyle = patch.color;
    ctx.beginPath();
    ctx.ellipse(patch.x + sway, patch.y, patch.r * 1.45, patch.r * 0.72, index * 0.45, 0, Math.PI * 2);
    ctx.fill();
  });

  for (let i = 0; i < 42; i++) {
    const x = (i * 137 + 31) % GAME_WIDTH;
    const y = (i * 83 + 57) % GAME_HEIGHT;
    const size = 2 + (i % 4);
    ctx.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.12)";
    ctx.fillRect(x, y, size, 1);
  }
}

function buildTrackPath(ctx: CanvasRenderingContext2D, points: PathPoint[]) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
}

function drawTrack(
  ctx: CanvasRenderingContext2D,
  theme: SceneTheme,
  frame: number,
  routes: RouteConfig[],
  activeRouteIds: string[]
) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  routes.forEach((route) => {
    const isActive = activeRouteIds.includes(route.id);
    ctx.globalAlpha = isActive ? 1 : 0.62;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 8;
    buildTrackPath(ctx, route.points);
    ctx.lineWidth = 54;
    ctx.strokeStyle = theme.trackOuter;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    buildTrackPath(ctx, route.points);
    ctx.lineWidth = 46;
    ctx.strokeStyle = theme.trackEdge;
    ctx.stroke();

    buildTrackPath(ctx, route.points);
    ctx.lineWidth = 34;
    ctx.strokeStyle = theme.trackInner;
    ctx.stroke();

    buildTrackPath(ctx, route.points);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.stroke();

    buildTrackPath(ctx, route.points);
    ctx.lineWidth = isActive ? 2.5 : 1.5;
    ctx.strokeStyle = isActive ? theme.trackLine : "rgba(255,255,255,0.12)";
    ctx.setLineDash([18, 18]);
    ctx.lineDashOffset = -frame * 0.7;
    ctx.stroke();
    ctx.setLineDash([]);
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawGate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  label: string,
  isExit = false
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 34, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#151515";
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  roundedRectPath(ctx, -26, -24, 52, 44, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = colorWithAlpha(color, isExit ? 0.22 : 0.18);
  roundedRectPath(ctx, -16, -14, 32, 25, 6);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.84)";
  ctx.font = "bold 8px var(--font-display)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

function drawObstacleSprite(ctx: CanvasRenderingContext2D, obs: ObstacleConfig) {
  ctx.save();
  ctx.translate(obs.x, obs.y);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, obs.radius * 0.55, obs.radius * 1.1, obs.radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  if (obs.name.includes("Озеро")) {
    const water = ctx.createRadialGradient(-8, -8, 4, 0, 0, obs.radius);
    water.addColorStop(0, "#67e8f9");
    water.addColorStop(0.45, obs.color);
    water.addColorStop(1, "#082f49");
    ctx.fillStyle = water;
    ctx.strokeStyle = "#bae6fd";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, obs.radius * 1.15, obs.radius * 0.78, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.34)";
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 11, -2 + i * 4, obs.radius * 0.28, 4, -0.1, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (obs.name.includes("Infinix")) {
    ctx.rotate(-0.25);
    ctx.fillStyle = "#111827";
    ctx.strokeStyle = obs.borderColor;
    ctx.lineWidth = 3;
    roundedRectPath(ctx, -18, -28, 36, 56, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#3b0764";
    roundedRectPath(ctx, -13, -21, 26, 39, 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(216,180,254,0.55)";
    ctx.beginPath();
    ctx.moveTo(-10, -14);
    ctx.lineTo(12, 6);
    ctx.moveTo(9, -15);
    ctx.lineTo(-7, 15);
    ctx.stroke();
    ctx.fillStyle = "#a855f7";
    ctx.fillRect(-5, 21, 10, 2);
  } else {
    ctx.fillStyle = obs.color;
    ctx.strokeStyle = obs.borderColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-obs.radius * 0.9, obs.radius * 0.25);
    ctx.lineTo(-obs.radius * 0.55, -obs.radius * 0.75);
    ctx.lineTo(obs.radius * 0.05, -obs.radius * 0.95);
    ctx.lineTo(obs.radius * 0.82, -obs.radius * 0.2);
    ctx.lineTo(obs.radius * 0.62, obs.radius * 0.58);
    ctx.lineTo(-obs.radius * 0.25, obs.radius * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-obs.radius * 0.45, -obs.radius * 0.35);
    ctx.lineTo(obs.radius * 0.02, -obs.radius * 0.18);
    ctx.lineTo(obs.radius * 0.38, -obs.radius * 0.55);
    ctx.stroke();
  }

  ctx.restore();
}

function drawMineSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  pulse = 1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.45, size * 1.25, size * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colorWithAlpha(color, 0.82);
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `rgba(255,255,255,${0.55 * pulse})`;
  ctx.fillRect(-2, -size - 4, 4, 5);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────
//  Towers
// ─────────────────────────────────────────────────────────────────────────

function drawTowerSprite(
  ctx: CanvasRenderingContext2D,
  tower: PlacedTower,
  angle: number,
  selected: boolean
) {
  ctx.save();
  ctx.translate(tower.x, tower.y);

  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.beginPath();
  ctx.ellipse(0, 16, 23, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111214";
  ctx.strokeStyle = selected ? "#ffffff" : colorWithAlpha(tower.color, 0.92);
  ctx.lineWidth = selected ? 3 : 2;
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = colorWithAlpha(tower.color, 0.18);
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();

  if (tower.level > 1) {
    ctx.strokeStyle = colorWithAlpha(tower.color, 0.65);
    ctx.lineWidth = Math.min(5, 1 + tower.level * 0.7);
    ctx.beginPath();
    ctx.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + Math.min(1, tower.level / 5) * Math.PI * 2);
    ctx.stroke();
  }

  ctx.rotate(angle);
  ctx.fillStyle = tower.color;
  ctx.strokeStyle = "#020617";
  ctx.lineWidth = 2;

  switch (tower.type) {
    case "hammer":
      roundedRectPath(ctx, -6, -8, 16, 16, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#cbd5e1";
      roundedRectPath(ctx, 7, -4, 22, 8, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#64748b";
      roundedRectPath(ctx, 25, -8, 9, 16, 2);
      ctx.fill();
      break;
    case "boomerang":
      ctx.strokeStyle = tower.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(5, 0, 15, -1.15, 1.15);
      ctx.stroke();
      ctx.strokeStyle = "#fef3c7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(5, 0, 10, -1, 1);
      ctx.stroke();
      break;
    case "coffee":
      ctx.rotate(-angle);
      ctx.fillStyle = "#facc15";
      roundedRectPath(ctx, -11, -7, 22, 18, 4);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(12, 2, 6, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 5, -13);
        ctx.quadraticCurveTo(i * 5 + 3, -18, i * 5, -23);
        ctx.stroke();
      }
      break;
    case "candy":
      roundedRectPath(ctx, -8, -7, 28, 14, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fed7aa";
      ctx.beginPath();
      ctx.arc(20, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "infinix":
      ctx.rotate(-angle * 0.3);
      ctx.fillStyle = "#1f1235";
      roundedRectPath(ctx, -9, -14, 18, 28, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#a855f7";
      ctx.fillRect(-5, -8, 10, 13);
      ctx.strokeStyle = "#d8b4fe";
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.lineTo(0, -25);
      ctx.moveTo(-7, -22);
      ctx.lineTo(7, -22);
      ctx.stroke();
      break;
    case "gas":
      ctx.rotate(-angle);
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        ctx.save();
        ctx.rotate(a);
        roundedRectPath(ctx, 5, -3, 14, 6, 3);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = "#052e16";
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case "sniper":
      roundedRectPath(ctx, -7, -6, 18, 12, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#0f172a";
      roundedRectPath(ctx, 8, -3, 32, 6, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fda4af";
      ctx.beginPath();
      ctx.arc(2, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "chain":
      ctx.rotate(-angle);
      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-8, 9);
      ctx.lineTo(-3, -1);
      ctx.lineTo(4, 5);
      ctx.lineTo(9, -10);
      ctx.stroke();
      ctx.fillStyle = "#0ea5e9";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case "kladmen":
      ctx.rotate(-angle);
      ctx.fillStyle = "#7f1d1d";
      roundedRectPath(ctx, -12, -10, 24, 20, 4);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#fecaca";
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.moveTo(0, -7);
      ctx.lineTo(0, 7);
      ctx.stroke();
      break;
    case "bankomat":
      ctx.rotate(-angle);
      ctx.fillStyle = "#1e293b";
      roundedRectPath(ctx, -13, -16, 26, 32, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#facc15";
      ctx.fillRect(-8, -9, 16, 7);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(-6, 5, 12, 3);
      break;
    case "monolith":
      ctx.rotate(-angle);
      ctx.fillStyle = "#52525b";
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(12, 12);
      ctx.lineTo(-12, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#d4d4d8";
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(4, 8);
      ctx.stroke();
      break;
    default:
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
  }

  ctx.restore();
}

function drawTowerMini(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: string,
  color: string,
  alpha = 1
) {
  const tower: PlacedTower = {
    id: "preview",
    x,
    y,
    type,
    range: 0,
    damage: 0,
    fireRate: 0,
    emoji: "",
    color,
    name: "",
    cooldown: 0,
    upgradesBought: [],
    path1Tier: 0,
    path2Tier: 0,
    path3Tier: 0,
    level: 1,
    totalKills: 0,
    pierce: 1,
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  drawTowerSprite(ctx, tower, 0, false);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────
//  Enemies
// ─────────────────────────────────────────────────────────────────────────

function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  enemy: ActiveEnemy,
  frame: number
) {
  const r = enemy.radius;
  const hoverOffset = enemy.isFlying ? 12 + Math.sin(frame * 0.12) * 4 : 0;
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (enemy.isCamo) ctx.globalAlpha = enemy.isPhantomCamo ? 0.52 : 0.72;

  // Drop shadow (on the ground for flying enemies)
  ctx.fillStyle = enemy.isFlying ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.78, r * 1.05, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw flying body above the shadow
  ctx.translate(0, -hoverOffset);

  const fill = enemy.color;
  const stroke = enemy.borderColor;
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(2, r * 0.12);

  if (enemy.type === "granite") {
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.35);
    ctx.lineTo(-r * 0.58, -r * 0.62);
    ctx.lineTo(0, -r);
    ctx.lineTo(r * 0.8, -r * 0.22);
    ctx.lineTo(r * 0.6, r * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (enemy.type === "drone_brat" || enemy.type === "drone_brat_armored") {
    // Drone body
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.1, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Rotor blades
    ctx.strokeStyle = colorWithAlpha("#e2e8f0", 0.8);
    ctx.lineWidth = 2;
    const rotorWobble = Math.sin(frame * 0.4) * 3;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.55, r * 0.9 + rotorWobble, r * 0.12, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Drone eye
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.arc(r * 0.45, -r * 0.08, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    // Propeller blur
    ctx.fillStyle = colorWithAlpha("#ffffff", 0.25);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.55, r * 0.8, r * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === "matryoshka" || enemy.type === "big_matryoshka") {
    ctx.beginPath();
    ctx.ellipse(0, r * 0.08, r * 0.75, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = colorWithAlpha("#ffffff", 0.18);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.24, r * 0.38, r * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === "phantom") {
    ctx.fillStyle = colorWithAlpha(fill, 0.72);
    ctx.beginPath();
    ctx.arc(0, -r * 0.12, r * 0.78, Math.PI, 0);
    ctx.lineTo(r * 0.68, r * 0.65);
    ctx.quadraticCurveTo(r * 0.3, r * 0.35, 0, r * 0.68);
    ctx.quadraticCurveTo(-r * 0.3, r * 0.35, -r * 0.68, r * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (enemy.type === "exploder") {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#fed7aa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.82);
    ctx.quadraticCurveTo(r * 0.35, -r * 1.25, r * 0.72, -r * 0.9);
    ctx.stroke();
  } else {
    const lean = enemy.type === "fast" || enemy.type === "jumper" || enemy.type === "kamikaze" ? -0.18 : 0;
    ctx.rotate(lean);
    roundedRectPath(ctx, -r * 0.62, -r * 0.28, r * 1.24, r * 1.08, r * 0.32);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -r * 0.68, r * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(-lean);
  }

  ctx.fillStyle = "rgba(0,0,0,0.36)";
  ctx.beginPath();
  ctx.arc(-r * 0.2, -r * 0.68, Math.max(1.4, r * 0.08), 0, Math.PI * 2);
  ctx.arc(r * 0.22, -r * 0.68, Math.max(1.4, r * 0.08), 0, Math.PI * 2);
  ctx.fill();

  if (enemy.isArmored || enemy.isSuperArmored || enemy.isLead) {
    ctx.strokeStyle = enemy.isSuperArmored ? "#e5e7eb" : "#93c5fd";
    ctx.lineWidth = enemy.isSuperArmored ? 4 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95, -2.55, -0.6);
    ctx.stroke();
  }

  if (enemy.shieldHp && enemy.shieldHp > 0) {
    ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r + 5, -Math.PI * 0.8, Math.PI * 0.8);
    ctx.stroke();
  }

  if (enemy.type === "infinix_brat" || enemy.isGlitching) {
    ctx.strokeStyle = colorWithAlpha("#d8b4fe", 0.65);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const offset = Math.sin(frame * 0.12 + i) * 3;
      ctx.strokeRect(-r * 0.75 + i * r * 0.5 + offset, -r * 1.02 + i * 2, r * 0.28, r * 0.18);
    }
  }

  if (enemy.isRegen || enemy.isHealer) {
    ctx.strokeStyle = enemy.isHealer ? "rgba(74,222,128,0.72)" : "rgba(244,114,182,0.62)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(4, -2);
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 2);
    ctx.stroke();
  }

  if (enemy.type === "boss" || enemy.type === "megaboss") {
    ctx.fillStyle = "#fef2f2";
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 1.02);
    ctx.lineTo(-r * 0.25, -r * 1.55);
    ctx.lineTo(0, -r * 1.02);
    ctx.lineTo(r * 0.25, -r * 1.55);
    ctx.lineTo(r * 0.55, -r * 1.02);
    ctx.fill();
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────
//  Projectiles
// ─────────────────────────────────────────────────────────────────────────

function drawProjectileSprite(ctx: CanvasRenderingContext2D, proj: Projectile) {
  ctx.save();
  ctx.translate(proj.x, proj.y);
  ctx.rotate(proj.spinRotation ?? proj.angle);
  ctx.strokeStyle = "#020617";
  ctx.lineWidth = 1.5;

  switch (proj.type) {
    case "hammer":
      ctx.fillStyle = "#cbd5e1";
      roundedRectPath(ctx, -5, -4, 18, 8, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = proj.color;
      roundedRectPath(ctx, 10, -8, 8, 16, 2);
      ctx.fill();
      ctx.stroke();
      break;
    case "boomerang":
      ctx.strokeStyle = proj.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 9, -1.1, 1.25);
      ctx.stroke();
      break;
    case "gas":
      ctx.fillStyle = colorWithAlpha(proj.color, 0.78);
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-5, -5);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fill();
      break;
    case "candy":
      ctx.fillStyle = "#fed7aa";
      roundedRectPath(ctx, -7, -5, 14, 10, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = proj.color;
      ctx.fillRect(-2, -5, 4, 10);
      break;
    case "infinix":
      ctx.fillStyle = colorWithAlpha(proj.color, 0.85);
      roundedRectPath(ctx, -9, -3, 18, 6, 2);
      ctx.fill();
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(-14, -1, 28, 2);
      break;
    case "sniper":
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(-7, -4);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-7, 4);
      ctx.closePath();
      ctx.fill();
      break;
    case "chain":
      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(-4, -5);
      ctx.lineTo(2, 4);
      ctx.lineTo(12, -2);
      ctx.stroke();
      break;
    default:
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────
//  Inline draw helpers used inside the per-frame loop.
//  These are pure (no state mutation) — they only touch the provided ctx.
// ─────────────────────────────────────────────────────────────────────────

function drawSelectedTowerRange(
  ctx: CanvasRenderingContext2D,
  rc: RenderContext
) {
  if (!rc.selectedPlacedTowerId) return;
  const selectedTower = rc.towers.find((t) => t.id === rc.selectedPlacedTowerId);
  if (!selectedTower) return;
  ctx.beginPath();
  ctx.arc(selectedTower.x, selectedTower.y, rc.getEffectiveTowerRange(selectedTower), 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawHoveredTowerRange(
  ctx: CanvasRenderingContext2D,
  rc: RenderContext
) {
  if (!rc.isMouseOnCanvas || rc.selectedShopTower) return;
  const hoveredTower = rc.towers.find(
    (t) => rc.getDistance(rc.mousePos.x, rc.mousePos.y, t.x, t.y) < 26
  );
  if (!hoveredTower || hoveredTower.id === rc.selectedPlacedTowerId) return;
  ctx.beginPath();
  ctx.arc(hoveredTower.x, hoveredTower.y, rc.getEffectiveTowerRange(hoveredTower), 0, Math.PI * 2);
  ctx.fillStyle = "rgba(6, 182, 212, 0.04)";
  ctx.strokeStyle = "rgba(6, 182, 212, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawSupportTowerRings(ctx: CanvasRenderingContext2D, rc: RenderContext) {
  rc.towers.forEach((tower) => {
    if (rc.isSupportTowerType(tower.type)) {
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
      ctx.fillStyle = tower.type === "bankomat" ? "rgba(250, 204, 21, 0.025)" : "rgba(234, 179, 8, 0.02)";
      ctx.strokeStyle = tower.type === "bankomat" ? "rgba(250, 204, 21, 0.16)" : "rgba(234, 179, 8, 0.1)";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();

      // Coffee steam particles
      if (tower.type === "coffee" && Math.random() < 0.15) {
        const steamCap = ARRAY_CAPS.PARTICLES * (rc.settings.effectLimits ? 1 : 2);
        pushWithCap(
          rc.particles,
          {
            x: tower.x + (Math.random() - 0.5) * 10,
            y: tower.y - 10,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -Math.random() * 0.8 - 0.3,
            color: "rgba(255, 255, 255, 0.3)",
            size: Math.random() * 3 + 1,
            life: 40,
            maxLife: 40,
          },
          steamCap
        );
      }
    }
    if (tower.type === "gas") {
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(34, 197, 94, 0.03)";
      ctx.fill();
    }
  });
}

function drawTowerBuffIndicators(ctx: CanvasRenderingContext2D, rc: RenderContext) {
  rc.towers.forEach((tower) => {
    // Support buff visual indicator
    if (tower.hasCoffeeBuff && !rc.isSupportTowerType(tower.type)) {
      const pulse = Math.sin(rc.frame * 0.08) * 0.3 + 0.7;
      const strength = tower.coffeeBuffStrength || 0.5;
      const glowRadius = 20 + strength * 4;

      // Golden glow ring
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, glowRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(234, 179, 8, ${0.3 * pulse * strength})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner golden fill
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(234, 179, 8, ${0.06 * pulse * strength})`;
      ctx.fill();

      ctx.fillStyle = `rgba(250, 204, 21, ${0.78 * pulse})`;
      ctx.beginPath();
      ctx.moveTo(tower.x, tower.y - 31);
      ctx.lineTo(tower.x + 4, tower.y - 25);
      ctx.lineTo(tower.x, tower.y - 19);
      ctx.lineTo(tower.x - 4, tower.y - 25);
      ctx.closePath();
      ctx.fill();
    }

    // Camo buff indicator
    if (tower.hasCamoBuff && !tower.camoDetection) {
      ctx.strokeStyle = "rgba(125, 211, 252, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(tower.x + 15, tower.y - 18, 6, 3.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(125, 211, 252, 0.85)";
      ctx.beginPath();
      ctx.arc(tower.x + 15, tower.y - 18, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawShopPreview(ctx: CanvasRenderingContext2D, rc: RenderContext) {
  const activePreviewType = rc.draggedTowerType || rc.selectedShopTower;
  const previewPos =
    rc.draggedTowerPos ||
    (rc.selectedShopTower && rc.isMouseOnCanvas ? rc.mousePos : null);

  if (!activePreviewType || !previewPos || previewPos.x <= 0 || previewPos.y <= 0) {
    return;
  }
  const config = TOWER_CONFIGS[activePreviewType];
  if (!config) return;

  const onPath = rc.isPositionOnPath(previewPos.x, previewPos.y, 26);
  const onObstacle = rc.activeMap.obstacles.some(
    (obs) => rc.getDistance(previewPos.x, previewPos.y, obs.x, obs.y) < obs.radius + 18
  );
  const overlap = rc.towers.some(
    (t) => rc.getDistance(previewPos.x, previewPos.y, t.x, t.y) < 26
  );
  const outOfBounds =
    previewPos.x < 24 ||
    previewPos.x > GAME_WIDTH - 24 ||
    previewPos.y < 24 ||
    previewPos.y > GAME_HEIGHT - 24;
  const invalid = onPath || onObstacle || overlap || outOfBounds;

  // Range circle preview (full range)
  ctx.beginPath();
  ctx.arc(previewPos.x, previewPos.y, config.range, 0, Math.PI * 2);
  ctx.fillStyle = invalid ? "rgba(239, 68, 68, 0.06)" : "rgba(34, 197, 94, 0.06)";
  ctx.strokeStyle = invalid ? "rgba(239, 68, 68, 0.35)" : "rgba(34, 197, 94, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  // Tower base preview
  ctx.beginPath();
  ctx.arc(previewPos.x, previewPos.y, 18, 0, Math.PI * 2);
  ctx.fillStyle = invalid ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)";
  ctx.strokeStyle = invalid ? "#ef4444" : "#22c55e";
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();

  drawTowerMini(ctx, previewPos.x, previewPos.y, activePreviewType, config.color, 0.86);

  // Tower name above
  ctx.font = "bold 10px Arial";
  ctx.fillStyle = invalid ? "#ef4444" : "#22c55e";
  ctx.fillText(config.name, previewPos.x, previewPos.y - 28);

  // Status text below
  if (invalid) {
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 9px Arial";
    let reason = "";
    if (onPath) reason = "На дорозі!";
    else if (onObstacle) reason = "Перешкода!";
    else if (overlap) reason = "Занадто близько!";
    else if (outOfBounds) reason = "За межами!";
    ctx.fillText(reason, previewPos.x, previewPos.y + 28);
  } else {
    ctx.fillStyle = "rgba(34, 197, 94, 0.7)";
    ctx.font = "9px Arial";
    ctx.fillText(`GOLD ${config.cost}`, previewPos.x, previewPos.y + 28);
  }
}

function drawShopHoverRangePreview(ctx: CanvasRenderingContext2D, rc: RenderContext) {
  if (rc.draggedTowerType || rc.selectedShopTower || !rc.hoveredShopTower || !rc.isMouseOnCanvas) {
    return;
  }
  const hoverConfig = TOWER_CONFIGS[rc.hoveredShopTower];
  if (!hoverConfig) return;
  const pos = rc.mousePos;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, hoverConfig.range, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(6, 182, 212, 0.05)";
  ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawEnemyOverlay(ctx: CanvasRenderingContext2D, rc: RenderContext) {
  rc.enemies.forEach((enemy) => {
    if (enemy.isDying) {
      const deathElapsed = rc.frame - (enemy.deathFrame ?? 0);
      const fadeAlpha = Math.max(0, 1 - deathElapsed / 10);
      if (fadeAlpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = fadeAlpha;
      drawEnemySprite(ctx, enemy, rc.frame);
      ctx.restore();
      return;
    }

    // Draw glitched lag shadow if freezing/glitching
    if (enemy.freezeDuration > 0) {
      ctx.beginPath();
      ctx.arc(
        enemy.x + (getPureRandom() - 0.5) * 4,
        enemy.y + (getPureRandom() - 0.5) * 4,
        enemy.radius,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "rgba(168, 85, 247, 0.15)";
      ctx.fill();
    }

    drawEnemySprite(ctx, enemy, rc.frame);

    // Tier indicator badge
    if (enemy.tier && enemy.tier > 1) {
      const tierColors = ["", "#94a3b8", "#22c55e", "#3b82f6", "#a855f7", "#f59e0b"];
      const tierColor = tierColors[enemy.tier] || "#ffffff";
      const bx = enemy.x + enemy.radius - 2;
      const by = enemy.y - enemy.radius + 2;
      ctx.fillStyle = tierColor;
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.font = "bold 8px Arial";
      ctx.fillText(`${enemy.tier}`, bx, by);
    }

    // Healer aura (pulsing green ring)
    if (enemy.isHealer && enemy.hp > 0) {
      const healPulse = Math.sin(rc.frame * 0.1) * 0.3 + 0.7;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 30, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(74, 222, 128, ${0.25 * healPulse})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 60, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(74, 222, 128, ${0.12 * healPulse})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Status effect overlays
    if (enemy.slowDuration > 0) {
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (enemy.freezeDuration > 0) {
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(147, 197, 253, 0.7)";
      ctx.lineWidth = 3;
      ctx.stroke();
      // Ice crystals
      for (let ci = 0; ci < 3; ci++) {
        const cAngle = rc.frame * 0.05 + ci * ((Math.PI * 2) / 3);
        const cx = enemy.x + Math.cos(cAngle) * (enemy.radius + 6);
        const cy = enemy.y + Math.sin(cAngle) * (enemy.radius + 6);
        ctx.fillStyle = "#93c5fd";
        ctx.fillRect(cx - 2, cy - 2, 4, 4);
      }
    }
    if (enemy.gasSlowDuration > 0) {
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(34, 197, 94, 0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (enemy.fireDoTStacks && enemy.fireDoTStacks.length > 0) {
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(249, 115, 22, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();

      for (let fi = 0; fi < 3; fi++) {
        const offsetAngle = (rc.frame * 0.1 + fi * 2.1) % (Math.PI * 2);
        const fx = enemy.x + Math.sin(offsetAngle) * (enemy.radius * 0.5);
        const fy = enemy.y - (enemy.radius * 0.3) - ((rc.frame + fi * 20) % 15);
        ctx.fillStyle = fi % 2 === 0 ? "#f97316" : "#facc15";
        ctx.fillRect(fx - 1.5, fy - 1.5, 3, 3);
      }
    }
    if (enemy.isCamo) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    // Hit flash
    if (enemy.lastHitFrame && rc.frame - enemy.lastHitFrame < 4) {
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fill();
    }

    // Draw armor shield icon if armored
    if (enemy.isArmored || enemy.isSuperArmored) {
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(enemy.x - enemy.radius + 3, enemy.y - enemy.radius + 3, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw bug icon if Copilot Bug active
    if (enemy.hasCopilotBug) {
      ctx.fillStyle = "#a855f7";
      ctx.beginPath();
      ctx.arc(enemy.x + enemy.radius - 3, enemy.y - enemy.radius + 3, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Health bar
    const barW = enemy.radius * 1.8;
    const barH = 4;
    const barX = enemy.x - barW / 2;
    const barY = enemy.y - enemy.radius - 8;

    ctx.fillStyle = "#3f3f46";
    ctx.fillRect(barX, barY, barW, barH);

    const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
    const fillW = barW * Math.min(1.5, hpRatio);
    if (fillW > 0) {
      const hpGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
      if (hpRatio > 1.0) {
        hpGrad.addColorStop(0, "#0891b2");
        hpGrad.addColorStop(1, "#06b6d4");
      } else if (hpRatio > 0.5) {
        hpGrad.addColorStop(0, "#16a34a");
        hpGrad.addColorStop(1, "#22c55e");
      } else if (hpRatio > 0.25) {
        hpGrad.addColorStop(0, "#ca8a04");
        hpGrad.addColorStop(1, "#eab308");
      } else {
        hpGrad.addColorStop(0, "#dc2626");
        hpGrad.addColorStop(1, "#ef4444");
      }
      ctx.fillStyle = hpGrad;
      ctx.fillRect(barX, barY, fillW, barH);
    }

    // Shield bar
    if (enemy.shieldHp !== undefined && enemy.shieldHp > 0) {
      const shieldRatio = enemy.shieldHp / (enemy.maxShieldHp || 80);
      ctx.fillStyle = "#1e3a5f";
      ctx.fillRect(barX, barY - 5, barW, 3);
      ctx.fillStyle = "#0ea5e9";
      ctx.fillRect(barX, barY - 5, barW * shieldRatio, 3);
    }

    const pips: { color: string }[] = [];
    if (enemy.slowDuration > 0) pips.push({ color: "#3b82f6" });
    if (enemy.gasSlowDuration > 0) pips.push({ color: "#22c55e" });
    if (enemy.freezeDuration > 0) pips.push({ color: "#93c5fd" });
    if (enemy.fireDoTStacks && enemy.fireDoTStacks.length > 0) pips.push({ color: "#f97316" });
    if (enemy.isRegen) pips.push({ color: "#f472b6" });
    if (enemy.hasCopilotBug) pips.push({ color: "#a855f7" });
    const visiblePips = rc.settings.effectLimits ? pips.slice(0, 3) : pips;
    if (visiblePips.length > 0) {
      const pipY = enemy.y - enemy.radius - 14;
      const startX = enemy.x - ((visiblePips.length - 1) * 5) / 2;
      visiblePips.forEach((pip, pi) => {
        const px = startX + pi * 5;
        ctx.fillStyle = pip.color;
        ctx.beginPath();
        ctx.arc(px, pipY, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  });
}

function drawProjectileTrails(ctx: CanvasRenderingContext2D, rc: RenderContext) {
  rc.projectileTrail.forEach((t) => {
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
    ctx.fillStyle = t.color;
    ctx.globalAlpha = t.alpha;
    ctx.fill();
    ctx.globalAlpha = 1.0;
  });
}

function drawParticles(ctx: CanvasRenderingContext2D, rc: RenderContext) {
  rc.particles.forEach((p) => {
    ctx.fillStyle = p.color;
    const opacity = p.life / p.maxLife;
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    if (p.shape === "square") {
      ctx.rect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    } else {
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.globalAlpha = 1.0;
  });
}

function drawExplosionRings(ctx: CanvasRenderingContext2D, rc: RenderContext) {
  rc.explosionRings.forEach((r) => {
    const progress = 1 - r.life / (r.life + 1);

    // Flash core
    if (r.coreLife > 0) {
      const coreAlpha = r.coreLife / 30;
      const coreRadius = 8 + progress * 15;
      const coreGrad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, coreRadius);
      coreGrad.addColorStop(0, `rgba(255,255,255,${coreAlpha * 0.9})`);
      coreGrad.addColorStop(0.3, `rgba(255,240,200,${coreAlpha * 0.6})`);
      coreGrad.addColorStop(1, `rgba(255,200,100,0)`);
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(r.x, r.y, coreRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Multiple shockwave rings
    for (let ring = 0; ring < r.ringCount; ring++) {
      const ringProgress = Math.max(0, progress - ring * 0.12);
      const ringRadius = r.radius + (r.maxRadius - r.radius) * ringProgress;
      const ringAlpha =
        Math.max(0, (r.life - ring * 5) / 30) * (1 - ringProgress * 0.7);
      if (ringAlpha <= 0 || ringRadius <= 0) continue;
      ctx.beginPath();
      ctx.arc(r.x, r.y, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = ringAlpha;
      ctx.lineWidth = ring === 0 ? 3.5 : 2;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // Debris particles
    r.debris.forEach((d) => {
      if (d.life <= 0) return;
      const alpha = d.life / d.maxLife;
      ctx.fillStyle = d.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      const rot = (d.maxLife - d.life) * 0.2;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(rot);
      ctx.rect(-d.size / 2, -d.size / 2, d.size, d.size);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1.0;
    });
  });
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D, rc: RenderContext) {
  rc.floatingTexts.forEach((ft) => {
    ctx.save();
    const opacity = ft.life / ft.maxLife;
    ctx.globalAlpha = opacity;
    ctx.fillStyle = ft.color;
    ctx.font = `bold ${ft.size || 11}px ${ft.font || "var(--font-body)"}`;
    ctx.textAlign = "center";
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  });
}

function drawMines(ctx: CanvasRenderingContext2D, rc: RenderContext) {
  rc.mines.forEach((mine) => {
    const pulse = Math.sin(rc.frame * 0.15) * 0.3 + 0.7;
    drawMineSprite(ctx, mine.x, mine.y, 5.5, "#ef4444", pulse);
    ctx.beginPath();
    ctx.arc(mine.x, mine.y, mine.triggerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.12 * pulse})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}

function drawMineProjectiles(ctx: CanvasRenderingContext2D, rc: RenderContext) {
  rc.mineProjectiles.forEach((mp) => {
    const arcHeight = Math.sin(mp.progress * Math.PI) * 16;
    ctx.save();
    ctx.translate(mp.x, mp.y - arcHeight);
    ctx.rotate(mp.progress * Math.PI * 2);
    drawMineSprite(ctx, 0, 0, 6, mp.color, 1);
    ctx.restore();
  });
}

function drawSpeedTrails(ctx: CanvasRenderingContext2D, rc: RenderContext) {
  rc.speedTrails.forEach((trail) => {
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, trail.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(244, 63, 94, ${0.08 * (trail.life / 120)})`;
    ctx.fill();
  });
}

function drawWaveAnnouncement(ctx: CanvasRenderingContext2D, rc: RenderContext) {
  if (!rc.waveAnnouncement) return;
  const wa = rc.waveAnnouncement;
  const elapsed = rc.frame - wa.frameStart;
  if (elapsed < 120) {
    const alpha =
      elapsed < 15 ? elapsed / 15 : elapsed > 90 ? 1 - (elapsed - 90) / 30 : 1;
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px var(--font-display)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`WAVE ${wa.wave}`, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    ctx.globalAlpha = 1.0;
  } else {
    rc.onClearWaveAnnouncement();
  }
}

function drawVignette(ctx: CanvasRenderingContext2D) {
  const vignette = ctx.createRadialGradient(
    GAME_WIDTH / 2,
    GAME_HEIGHT / 2,
    GAME_WIDTH * 0.3,
    GAME_WIDTH / 2,
    GAME_HEIGHT / 2,
    GAME_WIDTH * 0.7
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawTowers(
  ctx: CanvasRenderingContext2D,
  rc: RenderContext
): void {
  rc.towers.forEach((tower) => {
    let towerAngle = tower.angle || 0;
    if (!rc.isSupportTowerType(tower.type) && tower.type !== "gas") {
      let nearestEnemy: ActiveEnemy | null = null;
      let nearestDist = Infinity;
      const isCamoCapable = tower.camoDetection || tower.hasCamoBuff;
      for (const enemy of rc.enemies) {
        if (enemy.hp <= 0) continue;
        if (enemy.isCamo && !isCamoCapable) continue;
        if (enemy.isPhantomCamo && !tower.camoDetection && !tower.hasCamoBuff) continue;
        if (enemy.isFlying && !ANTI_AIR_TOWERS.has(tower.type)) continue;

        const d = rc.getDistance(tower.x, tower.y, enemy.x, enemy.y);
        if (d < nearestDist && d <= rc.getEffectiveTowerRange(tower)) {
          nearestDist = d;
          nearestEnemy = enemy;
        }
      }
      if (nearestEnemy) {
        towerAngle = Math.atan2(nearestEnemy.y - tower.y, nearestEnemy.x - tower.x);
        tower.angle = towerAngle;
      }
    }
    drawTowerSprite(ctx, tower, towerAngle, rc.selectedPlacedTowerId === tower.id);
  });
}

function drawGates(ctx: CanvasRenderingContext2D, rc: RenderContext) {
  rc.activeMap.gates.forEach((gate: MapGate) => {
    drawGate(
      ctx,
      gate.x,
      gate.y,
      gate.isExit && rc.lives < 120 ? "#ef4444" : gate.color,
      gate.label,
      gate.isExit
    );
  });
}

function drawObstacles(ctx: CanvasRenderingContext2D, rc: RenderContext) {
  rc.activeMap.obstacles.forEach((obs) => drawObstacleSprite(ctx, obs));
}

// ─────────────────────────────────────────────────────────────────────────
//  Public entry point — renderGame(). Mirrors the previous in-component
//  per-frame draw order exactly.
// ─────────────────────────────────────────────────────────────────────────

export function renderGame(rc: RenderContext): void {
  const { ctx } = rc;

  // Screen shake (mutates the shared shake ref)
  const isShaking = rc.shake.duration > 0;
  if (isShaking) {
    rc.shake.x = (Math.random() - 0.5) * rc.shake.intensity;
    rc.shake.y = (Math.random() - 0.5) * rc.shake.intensity;
    rc.shake.intensity *= 0.9;
    rc.shake.duration--;
    ctx.save();
    ctx.translate(rc.shake.x, rc.shake.y);
  }

  // Background
  drawSceneBackground(ctx, rc.theme, rc.frame, rc.activeMap.decor);
  drawTrack(ctx, rc.theme, rc.frame, rc.activeMap.routes, rc.activeRouteIds);
  drawGates(ctx, rc);
  drawMines(ctx, rc);
  drawMineProjectiles(ctx, rc);
  drawSpeedTrails(ctx, rc);
  drawObstacles(ctx, rc);

  // Range indicators
  drawSelectedTowerRange(ctx, rc);
  drawHoveredTowerRange(ctx, rc);
  drawSupportTowerRings(ctx, rc);

  // Towers
  drawTowers(ctx, rc);
  drawTowerBuffIndicators(ctx, rc);

  // Shop preview / hover
  drawShopPreview(ctx, rc);
  drawShopHoverRangePreview(ctx, rc);

  // Enemies (with overlays)
  drawEnemyOverlay(ctx, rc);

  // Projectiles + trails
  drawProjectileTrails(ctx, rc);
  rc.projectiles.forEach((proj) => drawProjectileSprite(ctx, proj));

  // Effects
  drawParticles(ctx, rc);
  drawExplosionRings(ctx, rc);
  drawFloatingTexts(ctx, rc);
  drawWaveAnnouncement(ctx, rc);

  // Restore screen shake
  if (isShaking) {
    ctx.restore();
  }

  // Vignette overlay
  drawVignette(ctx);
}
