import {
  type Maggot,
  type FoodItem,
  type PowerUpItem,
  type Particle,
  type ShockwaveRing,
  type FloatingText,
  type KillFeedItem,
  type LeaderboardEntry,
  SKINS,
} from "./types";
import { ARENA_RADIUS } from "./engine";

export class UrethraRenderer {
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;

  // Camera
  public camX = 0;
  public camY = 0;
  public zoom = 1.0;
  public targetZoom = 1.0;

  // Animation phase
  private pulsePhase = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public setSize(w: number, h: number) {
    this.width = w;
    this.height = h;
  }

  public render(
    player: Maggot | null,
    maggots: Maggot[],
    foods: FoodItem[],
    powerUps: PowerUpItem[],
    particles: Particle[],
    shockwaves: ShockwaveRing[],
    floatingTexts: FloatingText[],
    killFeed: KillFeedItem[],
    leaderboard: LeaderboardEntry[],
    spectateTarget?: Maggot | null
  ) {
    const ctx = this.ctx;
    this.pulsePhase += 0.02;

    // 1. Camera Follow & Dynamic Zoom
    const target = (player && player.alive ? player : spectateTarget) || (maggots[0] ?? null);
    if (target) {
      const head = target.segments[0] || target;
      this.camX += (head.x - this.camX) * 0.12;
      this.camY += (head.y - this.camY) * 0.12;

      const scoreScale = Math.max(1, target.score);
      this.targetZoom = Math.max(0.48, Math.min(1.1, 1.0 - Math.pow(scoreScale / 4000, 0.45) * 0.45));
      this.zoom += (this.targetZoom - this.zoom) * 0.05;
    }

    // 2. Clear Screen — Strict Near-Black Canvas (#0a0a0a)
    ctx.save();
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, this.width, this.height);

    // 3. Apply Camera Transform
    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camX, -this.camY);

    // 4. Draw Organic Background & Arena Boundary
    this.drawOrganicBackground(ctx);
    this.drawArenaBoundary(ctx);

    // 5. Draw Food & PowerUps
    this.drawFoods(ctx, foods);
    this.drawPowerUps(ctx, powerUps);

    // 6. Draw Shockwaves & Particles
    this.drawShockwaves(ctx, shockwaves);
    this.drawParticles(ctx, particles);

    // 7. Draw Maggots with Buff Auras & Custom Patterns
    this.drawMaggots(ctx, maggots, player);

    // 8. Draw Floating Texts
    this.drawFloatingTexts(ctx, floatingTexts);

    ctx.restore(); // Restore Camera Transform

    // 9. Draw HUD Overlay
    this.drawMinimap(ctx, player, maggots, foods, powerUps);
    this.drawKillFeed(ctx, killFeed);

    ctx.restore();
  }

  private drawOrganicBackground(ctx: CanvasRenderingContext2D) {
    const gridSize = 160;
    const startX = Math.floor((this.camX - (this.width / 2) / this.zoom) / gridSize) * gridSize;
    const endX = Math.ceil((this.camX + (this.width / 2) / this.zoom) / gridSize) * gridSize;
    const startY = Math.floor((this.camY - (this.height / 2) / this.zoom) / gridSize) * gridSize;
    const endY = Math.ceil((this.camY + (this.height / 2) / this.zoom) / gridSize) * gridSize;

    ctx.save();
    ctx.lineWidth = 1;

    for (let x = startX; x <= endX; x += gridSize) {
      const dist = Math.hypot(x, this.camY);
      if (dist > ARENA_RADIUS + 300) continue;

      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }

    for (let y = startY; y <= endY; y += gridSize) {
      const dist = Math.hypot(this.camX, y);
      if (dist > ARENA_RADIUS + 300) continue;

      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawArenaBoundary(ctx: CanvasRenderingContext2D) {
    ctx.save();

    ctx.beginPath();
    ctx.arc(0, 0, ARENA_RADIUS + 800, 0, Math.PI * 2);
    ctx.arc(0, 0, ARENA_RADIUS, 0, Math.PI * 2, true);
    ctx.fillStyle = "rgba(6, 6, 8, 0.92)";
    ctx.fill();

    const pulse = Math.sin(this.pulsePhase) * 3;
    ctx.beginPath();
    ctx.arc(0, 0, ARENA_RADIUS + pulse, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, ARENA_RADIUS - 6 + pulse, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(212, 175, 55, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  private drawFoods(ctx: CanvasRenderingContext2D, foods: FoodItem[]) {
    const viewLeft = this.camX - (this.width / 2) / this.zoom - 50;
    const viewRight = this.camX + (this.width / 2) / this.zoom + 50;
    const viewTop = this.camY - (this.height / 2) / this.zoom - 50;
    const viewBottom = this.camY + (this.height / 2) / this.zoom + 50;

    for (let i = 0; i < foods.length; i++) {
      const f = foods[i];
      if (f.x < viewLeft || f.x > viewRight || f.y < viewTop || f.y > viewBottom) continue;

      ctx.save();
      ctx.translate(f.x, f.y);

      if (f.type === "bean") {
        ctx.rotate(f.pulsePhase);
        ctx.fillStyle = "#3e2723";
        ctx.beginPath();
        ctx.ellipse(0, 0, f.radius, f.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#5d4037";
        ctx.beginPath();
        ctx.ellipse(-1, -1, f.radius * 0.7, f.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#1a0c08";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, f.radius * 0.75, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
      } else if (f.type === "granule") {
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.rect(-f.radius / 2, -f.radius / 2, f.radius, f.radius);
        ctx.fill();

        ctx.fillStyle = "#fff8e1";
        ctx.fillRect(-f.radius / 4, -f.radius / 4, f.radius / 2, f.radius / 2);
      } else if (f.type === "carrot") {
        const pulse = Math.sin(this.pulsePhase * 3 + f.pulsePhase) * 1.5;
        ctx.fillStyle = "#ff7a17";
        ctx.beginPath();
        ctx.arc(0, 0, f.radius + pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#e65100";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, (f.radius + pulse) * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      } else if (f.type === "sadoczyk") {
        const pulse = Math.sin(this.pulsePhase * 3 + f.pulsePhase) * 1.5;
        ctx.fillStyle = "#4caf50";
        ctx.beginPath();
        ctx.arc(0, 0, f.radius + pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#a5d6a7";
        ctx.beginPath();
        ctx.arc(-2, -2, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#4e342e";
        ctx.beginPath();
        ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawPowerUps(ctx: CanvasRenderingContext2D, powerUps: PowerUpItem[]) {
    const viewLeft = this.camX - (this.width / 2) / this.zoom - 60;
    const viewRight = this.camX + (this.width / 2) / this.zoom + 60;
    const viewTop = this.camY - (this.height / 2) / this.zoom - 60;
    const viewBottom = this.camY + (this.height / 2) / this.zoom + 60;

    for (let i = 0; i < powerUps.length; i++) {
      const pu = powerUps[i];
      if (pu.x < viewLeft || pu.x > viewRight || pu.y < viewTop || pu.y > viewBottom) continue;

      ctx.save();
      ctx.translate(pu.x, pu.y);

      const pulse = Math.sin(this.pulsePhase * 4 + pu.pulsePhase) * 3;
      const r = pu.radius + pulse;

      const colors: Record<string, string> = {
        magnet: "#00e5ff",
        ghost: "#b388ff",
        turbo: "#ff5252",
        multiplier: "#ffd700",
        shockwave: "#ffffff",
      };
      const color = colors[pu.type] || "#ffffff";

      ctx.fillStyle = "rgba(18, 19, 22, 0.85)";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 6 + pulse * 1.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 1.0;
      ctx.fillStyle = color;
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const labels: Record<string, string> = {
        magnet: "MAG",
        ghost: "GHO",
        turbo: "TUR",
        multiplier: "2X",
        shockwave: "PWR",
      };
      ctx.fillText(labels[pu.type] || "PWR", 0, 0);

      ctx.restore();
    }
  }

  private drawShockwaves(ctx: CanvasRenderingContext2D, shockwaves: ShockwaveRing[]) {
    for (let i = 0; i < shockwaves.length; i++) {
      const sw = shockwaves[i];
      const alpha = Math.max(0, sw.life / sw.maxLife);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = Math.max(1, 8 * alpha);
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const alpha = Math.max(0, p.life / p.maxLife);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, p.size * alpha), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawMaggots(ctx: CanvasRenderingContext2D, maggots: Maggot[], player: Maggot | null) {
    const sorted = [...maggots].sort((a, b) => (a.isPlayer ? 1 : b.isPlayer ? -1 : a.score - b.score));
    const now = performance.now();

    for (let i = 0; i < sorted.length; i++) {
      const maggot = sorted[i];
      if (!maggot.alive && (!maggot.deathTime || now - maggot.deathTime > 600)) {
        continue;
      }

      const skin = SKINS[maggot.skin] || SKINS.classic;
      const segs = maggot.segments;
      if (segs.length === 0) continue;

      const isInvulnerable = !!(maggot.invulnerableUntil && now < maggot.invulnerableUntil);
      const isGhost = maggot.activeBuffs.some((b) => b.type === "ghost" && b.expiresAt > now);
      const isMagnet = maggot.activeBuffs.some((b) => b.type === "magnet" && b.expiresAt > now);
      const isTurboBuff = maggot.activeBuffs.some((b) => b.type === "turbo" && b.expiresAt > now);
      const isMultiplier = maggot.activeBuffs.some((b) => b.type === "multiplier" && b.expiresAt > now);

      ctx.save();

      if (isGhost) {
        ctx.globalAlpha = 0.45;
      } else if (isInvulnerable) {
        ctx.globalAlpha = 0.65 + Math.sin(now * 0.015) * 0.25;
      }

      // Draw body segments from Tail to Head
      for (let s = segs.length - 1; s >= 0; s--) {
        const seg = segs[s];
        const isHead = s === 0;

        let baseColor: string;
        if (skin.pattern === "rainbow") {
          baseColor = `hsl(${(now * 0.08 + s * 16) % 360}, 95%, 55%)`;
        } else {
          const colorIndex = s % skin.bodyColors.length;
          baseColor = isHead ? skin.headColor : skin.bodyColors[colorIndex];
        }

        ctx.save();
        ctx.translate(seg.x, seg.y);

        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(0, 0, seg.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = isGhost ? "rgba(179, 136, 255, 0.6)" : "rgba(0, 0, 0, 0.25)";
        ctx.lineWidth = Math.max(1.5, seg.radius * 0.12);
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.beginPath();
        ctx.arc(-seg.radius * 0.22, -seg.radius * 0.22, seg.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        if (isHead) {
          this.drawMaggotHead(ctx, maggot, skin, seg.radius);

          if (isInvulnerable) {
            ctx.strokeStyle = "rgba(0, 229, 255, 0.6)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, seg.radius + 8 + Math.sin(now * 0.02) * 3, 0, Math.PI * 2);
            ctx.stroke();
          }

          if (isMagnet) {
            ctx.strokeStyle = "rgba(0, 229, 255, 0.7)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, seg.radius + 14 + Math.sin(now * 0.03) * 5, 0, Math.PI * 2);
            ctx.stroke();
          }

          if (isMultiplier) {
            ctx.strokeStyle = "rgba(255, 215, 0, 0.7)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, seg.radius + 12 + Math.sin(now * 0.03) * 4, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        ctx.restore();
      }

      // Draw Name and Score above Head
      if (maggot.alive) {
        const head = segs[0];
        ctx.save();
        ctx.font = "600 12px Inter, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = maggot.isPlayer ? "#ffffff" : isTurboBuff ? "#ff5252" : "#dadbdf";
        ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
        ctx.shadowBlur = 4;
        ctx.fillText(maggot.name, head.x, head.y - head.radius - 12);

        ctx.font = "500 10px monospace";
        ctx.fillStyle = "#7d8187";
        ctx.fillText(`${Math.floor(maggot.score)} g`, head.x, head.y - head.radius - 1);
        ctx.restore();
      }

      ctx.restore();
    }
  }

  private drawMaggotHead(
    ctx: CanvasRenderingContext2D,
    maggot: Maggot,
    skin: typeof SKINS[keyof typeof SKINS],
    headRadius: number
  ) {
    ctx.rotate(maggot.angle);

    // Mouth
    ctx.fillStyle = "#121316";
    ctx.beginPath();
    ctx.arc(headRadius * 0.75, 0, headRadius * 0.35, -0.6, 0.6);
    ctx.lineTo(headRadius * 0.5, 0);
    ctx.closePath();
    ctx.fill();

    // Eyes Customization based on eyeStyle
    const style = skin.eyeStyle || "normal";
    const eyeRadius = Math.max(3, headRadius * 0.3);
    const pupilRadius = Math.max(1.5, eyeRadius * 0.5);
    const eyeOffsetX = headRadius * 0.32;
    const eyeOffsetY = headRadius * 0.42;

    for (const side of [-1, 1]) {
      const ey = side * eyeOffsetY;

      if (style === "cyborg" && side === 1) {
        // Right Cyborg Lens
        ctx.fillStyle = "#ff1744";
        ctx.fillRect(eyeOffsetX - eyeRadius, ey - eyeRadius, eyeRadius * 2, eyeRadius * 2);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.strokeRect(eyeOffsetX - eyeRadius, ey - eyeRadius, eyeRadius * 2, eyeRadius * 2);
        continue;
      }

      if (style === "alien") {
        // Elongated black/glow almond eye
        ctx.fillStyle = skin.eyeColor || "#1de9b6";
        ctx.beginPath();
        ctx.ellipse(eyeOffsetX, ey, eyeRadius * 1.3, eyeRadius * 0.75, Math.PI * 0.15 * side, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.ellipse(eyeOffsetX + 2, ey, eyeRadius * 0.8, eyeRadius * 0.45, Math.PI * 0.15 * side, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      // Sclera
      ctx.fillStyle = skin.eyeColor || "#ffffff";
      ctx.beginPath();
      ctx.arc(eyeOffsetX, ey, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Pupil
      ctx.fillStyle = skin.pupilColor || "#000000";
      ctx.beginPath();
      ctx.arc(eyeOffsetX + eyeRadius * 0.35, ey, pupilRadius, 0, Math.PI * 2);
      ctx.fill();

      // Eye Glint
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(eyeOffsetX + eyeRadius * 0.45, ey - pupilRadius * 0.3, pupilRadius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Angry Brows
      if (style === "angry") {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(eyeOffsetX - eyeRadius * 0.5, ey - side * eyeRadius * 1.2);
        ctx.lineTo(eyeOffsetX + eyeRadius * 0.8, ey + side * eyeRadius * 0.2);
        ctx.stroke();
      }
    }
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D, floatingTexts: FloatingText[]) {
    for (let i = 0; i < floatingTexts.length; i++) {
      const ft = floatingTexts[i];
      const alpha = Math.max(0, ft.life / ft.maxLife);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "bold 13px Inter, -apple-system, sans-serif";
      ctx.fillStyle = ft.color;
      ctx.textAlign = "center";
      ctx.shadowColor = "#000000";
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  private drawMinimap(
    ctx: CanvasRenderingContext2D,
    player: Maggot | null,
    maggots: Maggot[],
    foods: FoodItem[],
    powerUps: PowerUpItem[]
  ) {
    const radarSize = 120;
    const margin = 20;
    const radarX = this.width - radarSize / 2 - margin;
    const radarY = this.height - radarSize / 2 - margin;
    const scale = (radarSize / 2) / ARENA_RADIUS;

    ctx.save();
    ctx.translate(radarX, radarY);

    ctx.beginPath();
    ctx.arc(0, 0, radarSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(18, 19, 22, 0.85)";
    ctx.fill();
    ctx.strokeStyle = "#212327";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    for (let i = 0; i < foods.length; i += 10) {
      const f = foods[i];
      ctx.fillRect(f.x * scale, f.y * scale, 1, 1);
    }

    ctx.fillStyle = "#00e5ff";
    for (let i = 0; i < powerUps.length; i++) {
      const pu = powerUps[i];
      ctx.fillRect(pu.x * scale - 1, pu.y * scale - 1, 2.5, 2.5);
    }

    for (let i = 0; i < maggots.length; i++) {
      const m = maggots[i];
      if (!m.alive || m.isPlayer) continue;
      const head = m.segments[0] || m;
      ctx.fillStyle = !m.isBot ? "#00e5ff" : m.score > 500 ? "#ff7a17" : "rgba(218, 219, 223, 0.4)";
      ctx.beginPath();
      ctx.arc(head.x * scale, head.y * scale, !m.isBot ? 3.5 : m.score > 500 ? 2.5 : 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (player && player.alive) {
      const pHead = player.segments[0] || player;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(pHead.x * scale, pHead.y * scale, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(pHead.x * scale, pHead.y * scale);
      ctx.lineTo(
        pHead.x * scale + Math.cos(player.angle) * 7,
        pHead.y * scale + Math.sin(player.angle) * 7
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawKillFeed(ctx: CanvasRenderingContext2D, killFeed: KillFeedItem[]) {
    if (killFeed.length === 0) return;

    ctx.save();
    ctx.font = "11px monospace";
    ctx.textAlign = "left";

    const startX = 20;
    let startY = 70;

    for (let i = 0; i < killFeed.length; i++) {
      const item = killFeed[i];
      const age = Date.now() - item.time;
      const alpha = Math.max(0, 1 - age / 6000);

      ctx.save();
      ctx.globalAlpha = alpha;

      const text = `${item.killer}  ×  ${item.victim}`;
      const metrics = ctx.measureText(text);

      ctx.fillStyle = "rgba(18, 19, 22, 0.85)";
      ctx.fillRect(startX - 6, startY - 13, metrics.width + 16, 18);
      ctx.strokeStyle = "#212327";
      ctx.lineWidth = 1;
      ctx.strokeRect(startX - 6, startY - 13, metrics.width + 16, 18);

      ctx.fillStyle = "#dadbdf";
      ctx.fillText(text, startX + 2, startY);
      ctx.restore();

      startY += 22;
    }

    ctx.restore();
  }
}
