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

    // 1. Smooth Camera Follow & Dynamic Zoom Transitions
    if (player && player.alive) {
      const head = (player.segments && player.segments[0]) ? player.segments[0] : player;
      if (head && !isNaN(head.x) && !isNaN(head.y)) {
        // Standard smooth tracking when alive
        this.camX += (head.x - this.camX) * 0.12;
        this.camY += (head.y - this.camY) * 0.12;
      }

      const scoreScale = Math.max(1, player.score || 30);
      this.targetZoom = Math.max(0.48, Math.min(1.1, 1.0 - Math.pow(scoreScale / 4000, 0.45) * 0.45));
      this.zoom += (this.targetZoom - this.zoom) * 0.05;
    } else if (player && !player.alive) {
      // Player died: softly hover over death point without sudden jumps
      const deathX = !isNaN(player.x) ? player.x : this.camX;
      const deathY = !isNaN(player.y) ? player.y : this.camY;
      this.camX += (deathX - this.camX) * 0.03;
      this.camY += (deathY - this.camY) * 0.03;

      // Gentle cinematic overview zoom out
      this.targetZoom = 0.72;
      this.zoom += (this.targetZoom - this.zoom) * 0.02;
    } else if (spectateTarget && spectateTarget.alive) {
      const head = (spectateTarget.segments && spectateTarget.segments[0]) ? spectateTarget.segments[0] : spectateTarget;
      if (head && !isNaN(head.x) && !isNaN(head.y)) {
        this.camX += (head.x - this.camX) * 0.04;
        this.camY += (head.y - this.camY) * 0.04;
      }
      this.targetZoom = 0.75;
      this.zoom += (this.targetZoom - this.zoom) * 0.025;
    }

    if (isNaN(this.camX)) this.camX = 0;
    if (isNaN(this.camY)) this.camY = 0;
    if (isNaN(this.zoom)) this.zoom = 1.0;

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
    this.drawFoods(ctx, foods || []);
    this.drawPowerUps(ctx, powerUps || []);

    // 6. Draw Shockwaves & Particles
    this.drawShockwaves(ctx, shockwaves || []);
    this.drawParticles(ctx, particles || []);

    // 7. Draw Maggots with Buff Auras & Custom Patterns
    this.drawMaggots(ctx, maggots || [], player);

    // 8. Draw Floating Texts
    this.drawFloatingTexts(ctx, floatingTexts || []);

    ctx.restore(); // Restore Camera Transform

    // 9. Draw HUD Overlay
    this.drawMinimap(ctx, player, maggots || [], foods || [], powerUps || []);
    this.drawKillFeed(ctx, killFeed || []);

    ctx.restore();
  }

  private drawOrganicBackground(ctx: CanvasRenderingContext2D) {
    const gridSize = 140;
    const startX = Math.floor((this.camX - (this.width / 2) / this.zoom) / gridSize) * gridSize;
    const endX = Math.ceil((this.camX + (this.width / 2) / this.zoom) / gridSize) * gridSize;
    const startY = Math.floor((this.camY - (this.height / 2) / this.zoom) / gridSize) * gridSize;
    const endY = Math.ceil((this.camY + (this.height / 2) / this.zoom) / gridSize) * gridSize;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();
  }

  private drawArenaBoundary(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Outer Void
    ctx.beginPath();
    ctx.arc(0, 0, ARENA_RADIUS + 3000, 0, Math.PI * 2);
    ctx.arc(0, 0, ARENA_RADIUS, 0, Math.PI * 2, true);
    ctx.fillStyle = "rgba(0, 0, 0, 0.96)";
    ctx.fill();

    // Barrier boundary ring
    ctx.beginPath();
    ctx.arc(0, 0, ARENA_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, ARENA_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = "#ff3366";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }

  private drawFoods(ctx: CanvasRenderingContext2D, foods: FoodItem[]) {
    const now = performance.now();
    const len = foods.length;

    for (let i = 0; i < len; i++) {
      const f = foods[i];
      if (!f) continue;

      // Viewport culling
      const dx = f.x - this.camX;
      const dy = f.y - this.camY;
      const margin = 80;
      const halfW = (this.width / 2) / this.zoom + margin;
      const halfH = (this.height / 2) / this.zoom + margin;

      if (dx < -halfW || dx > halfW || dy < -halfH || dy > halfH) {
        continue;
      }

      ctx.save();
      ctx.translate(f.x, f.y);

      if (f.glow) {
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 10;
      }

      ctx.fillStyle = f.color;

      if (f.type === "granule") {
        ctx.beginPath();
        ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.arc(-f.radius * 0.3, -f.radius * 0.3, f.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (f.type === "bean") {
        ctx.beginPath();
        ctx.ellipse(0, 0, f.radius * 1.15, f.radius * 0.75, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#1b0f0b";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-f.radius * 0.7, 0);
        ctx.quadraticCurveTo(0, f.radius * 0.3, f.radius * 0.7, 0);
        ctx.stroke();
      } else if (f.type === "drop") {
        ctx.beginPath();
        ctx.arc(0, f.radius * 0.2, f.radius * 0.8, 0, Math.PI);
        ctx.lineTo(0, -f.radius * 1.1);
        ctx.closePath();
        ctx.fill();
      } else if (f.type === "carrot") {
        const pulse = 1 + Math.sin(now * 0.006 + f.pulsePhase) * 0.12;
        ctx.scale(pulse, pulse);

        ctx.beginPath();
        ctx.moveTo(-f.radius * 0.6, -f.radius * 0.7);
        ctx.lineTo(f.radius * 0.6, -f.radius * 0.7);
        ctx.lineTo(0, f.radius * 1.1);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#76ff03";
        ctx.beginPath();
        ctx.arc(0, -f.radius * 0.7, f.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (f.type === "sadoczyk") {
        const pulse = 1 + Math.sin(now * 0.008 + f.pulsePhase) * 0.15;
        ctx.scale(pulse, pulse);

        ctx.beginPath();
        ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-f.radius * 0.3, -f.radius * 0.3, f.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawPowerUps(ctx: CanvasRenderingContext2D, powerUps: PowerUpItem[]) {
    const now = performance.now();
    for (let i = 0; i < powerUps.length; i++) {
      const pu = powerUps[i];
      if (!pu) continue;

      ctx.save();
      ctx.translate(pu.x, pu.y);

      const pulse = 1 + Math.sin(now * 0.005 + pu.pulsePhase) * 0.15;
      ctx.scale(pulse, pulse);

      const colors: Record<string, string> = {
        magnet: "#00e5ff",
        ghost: "#b388ff",
        turbo: "#ff5252",
        multiplier: "#ffd700",
        shockwave: "#ffffff",
      };

      const color = colors[pu.type] || "#ffffff";

      // Outer Aura Ring
      ctx.beginPath();
      ctx.arc(0, 0, pu.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Capsule body
      ctx.beginPath();
      ctx.arc(0, 0, pu.radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(18, 19, 22, 0.9)";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner Symbol
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      if (pu.type === "magnet") {
        ctx.beginPath();
        ctx.arc(0, 0, 8, Math.PI, 0, false);
        ctx.stroke();
      } else if (pu.type === "ghost") {
        ctx.beginPath();
        ctx.arc(0, -2, 6, Math.PI, 0, false);
        ctx.lineTo(6, 6);
        ctx.lineTo(2, 4);
        ctx.lineTo(-2, 6);
        ctx.lineTo(-6, 4);
        ctx.closePath();
        ctx.fill();
      } else if (pu.type === "turbo") {
        ctx.beginPath();
        ctx.moveTo(2, -8);
        ctx.lineTo(-6, 1);
        ctx.lineTo(0, 1);
        ctx.lineTo(-2, 8);
        ctx.lineTo(6, -1);
        ctx.lineTo(0, -1);
        ctx.closePath();
        ctx.fill();
      } else if (pu.type === "multiplier") {
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("2X", 0, 1);
      } else if (pu.type === "shockwave") {
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawShockwaves(ctx: CanvasRenderingContext2D, shockwaves: ShockwaveRing[]) {
    for (let i = 0; i < shockwaves.length; i++) {
      const sw = shockwaves[i];
      if (!sw) continue;
      const alpha = Math.max(0, sw.life / sw.maxLife);

      ctx.save();
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 4 * alpha + 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (!p) continue;
      const alpha = Math.max(0, p.life / p.maxLife);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawMaggots(ctx: CanvasRenderingContext2D, maggots: Maggot[], player: Maggot | null) {
    const sorted = [...maggots].sort((a, b) => (a.isPlayer ? 1 : b.isPlayer ? -1 : a.score - b.score));
    const now = performance.now();

    for (let i = 0; i < sorted.length; i++) {
      const maggot = sorted[i];
      if (!maggot || (!maggot.alive && (!maggot.deathTime || now - maggot.deathTime > 600))) {
        continue;
      }

      const skin = SKINS[maggot.skin] || SKINS.classic;
      const segs = maggot.segments;
      if (!segs || segs.length === 0 || !segs[0]) continue;

      const isInvulnerable = !!(maggot.invulnerableUntil && now < maggot.invulnerableUntil);
      const isGhost = maggot.activeBuffs && maggot.activeBuffs.some((b) => b && b.type === "ghost" && b.expiresAt > now);
      const isMagnet = maggot.activeBuffs && maggot.activeBuffs.some((b) => b && b.type === "magnet" && b.expiresAt > now);
      const isTurboBuff = maggot.activeBuffs && maggot.activeBuffs.some((b) => b && b.type === "turbo" && b.expiresAt > now);
      const isMultiplier = maggot.activeBuffs && maggot.activeBuffs.some((b) => b && b.type === "multiplier" && b.expiresAt > now);

      ctx.save();

      if (isGhost) {
        ctx.globalAlpha = 0.45;
      } else if (isInvulnerable) {
        ctx.globalAlpha = 0.65 + Math.sin(now * 0.015) * 0.25;
      }

      // Draw body segments from Tail to Head
      for (let s = segs.length - 1; s >= 0; s--) {
        const seg = segs[s];
        if (!seg || isNaN(seg.x) || isNaN(seg.y)) continue;
        const isHead = s === 0;

        let baseColor: string;
        if (skin.pattern === "rainbow") {
          baseColor = `hsl(${(now * 0.08 + s * 16) % 360}, 95%, 55%)`;
        } else {
          const bodyColors = skin.bodyColors && skin.bodyColors.length > 0 ? skin.bodyColors : ["#ffffff"];
          const colorIndex = s % bodyColors.length;
          baseColor = isHead ? (skin.headColor || "#ffffff") : bodyColors[colorIndex];
        }

        ctx.save();
        ctx.translate(seg.x, seg.y);

        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(0, 0, seg.radius || 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = isGhost ? "rgba(179, 136, 255, 0.6)" : "rgba(0, 0, 0, 0.25)";
        ctx.lineWidth = Math.max(1.5, (seg.radius || 14) * 0.12);
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.beginPath();
        ctx.arc(-(seg.radius || 14) * 0.22, -(seg.radius || 14) * 0.22, (seg.radius || 14) * 0.45, 0, Math.PI * 2);
        ctx.fill();

        if (isHead) {
          this.drawMaggotHead(ctx, maggot, skin, seg.radius || 14);

          if (isInvulnerable) {
            ctx.strokeStyle = "rgba(0, 229, 255, 0.6)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, (seg.radius || 14) + 8 + Math.sin(now * 0.02) * 3, 0, Math.PI * 2);
            ctx.stroke();
          }

          if (isMagnet) {
            ctx.strokeStyle = "rgba(0, 229, 255, 0.7)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, (seg.radius || 14) + 14 + Math.sin(now * 0.03) * 5, 0, Math.PI * 2);
            ctx.stroke();
          }

          if (isMultiplier) {
            ctx.strokeStyle = "rgba(255, 215, 0, 0.7)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, (seg.radius || 14) + 12 + Math.sin(now * 0.03) * 4, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        ctx.restore();
      }

      // Draw Name and Score above Head
      if (maggot.alive && segs[0]) {
        const head = segs[0];
        ctx.save();
        ctx.font = "600 12px Inter, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = maggot.isPlayer ? "#ffffff" : isTurboBuff ? "#ff5252" : "#dadbdf";
        ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
        ctx.shadowBlur = 4;
        ctx.fillText(maggot.name || "Опариш", head.x, head.y - (head.radius || 14) - 12);

        ctx.font = "500 10px monospace";
        ctx.fillStyle = "#7d8187";
        ctx.fillText(`${Math.floor(maggot.score || 0)} g`, head.x, head.y - (head.radius || 14) - 1);
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
    const angle = !isNaN(maggot.angle) ? maggot.angle : 0;
    ctx.rotate(angle);

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
      ctx.arc(eyeOffsetX + eyeRadius * 0.25, ey - pupilRadius * 0.4, pupilRadius * 0.4, 0, Math.PI * 2);
      ctx.fill();

      if (style === "angry") {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
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
      if (!ft) continue;
      const alpha = Math.max(0, ft.life / ft.maxLife);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "bold 13px Inter, -apple-system, sans-serif";
      ctx.fillStyle = ft.color || "#ffffff";
      ctx.textAlign = "center";
      ctx.shadowColor = "#000000";
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text || "", ft.x, ft.y);
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
      if (f) {
        ctx.fillRect(f.x * scale, f.y * scale, 1, 1);
      }
    }

    ctx.fillStyle = "#00e5ff";
    for (let i = 0; i < powerUps.length; i++) {
      const pu = powerUps[i];
      if (pu) {
        ctx.fillRect(pu.x * scale - 1, pu.y * scale - 1, 2.5, 2.5);
      }
    }

    for (let i = 0; i < maggots.length; i++) {
      const m = maggots[i];
      if (!m || !m.alive || m.isPlayer) continue;
      const head = (m.segments && m.segments[0]) ? m.segments[0] : m;
      if (!head) continue;
      ctx.fillStyle = !m.isBot ? "#00e5ff" : (m.score || 0) > 500 ? "#ff7a17" : "rgba(218, 219, 223, 0.4)";
      ctx.beginPath();
      ctx.arc(head.x * scale, head.y * scale, !m.isBot ? 3.5 : (m.score || 0) > 500 ? 2.5 : 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (player && player.alive) {
      const pHead = (player.segments && player.segments[0]) ? player.segments[0] : player;
      if (pHead) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(pHead.x * scale, pHead.y * scale, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(pHead.x * scale, pHead.y * scale);
        ctx.lineTo(
          pHead.x * scale + Math.cos(player.angle || 0) * 7,
          pHead.y * scale + Math.sin(player.angle || 0) * 7
        );
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private drawKillFeed(ctx: CanvasRenderingContext2D, killFeed: KillFeedItem[]) {
    if (!killFeed || killFeed.length === 0) return;

    ctx.save();
    ctx.font = "11px monospace";
    ctx.textAlign = "left";

    const startX = 20;
    let startY = 70;

    for (let i = 0; i < killFeed.length; i++) {
      const item = killFeed[i];
      if (!item) continue;
      const age = Date.now() - item.time;
      const alpha = Math.max(0, 1 - age / 6000);

      ctx.save();
      ctx.globalAlpha = alpha;

      const safeKiller = item.killer || "Опариш";
      const safeVictim = item.victim || "Опариш";
      const text = `${safeKiller}  ×  ${safeVictim}`;
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
