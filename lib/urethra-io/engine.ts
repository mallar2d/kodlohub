import {
  type Maggot,
  type Segment,
  type FoodItem,
  type FoodType,
  type PowerUpItem,
  type BuffType,
  type Particle,
  type ShockwaveRing,
  type FloatingText,
  type KillFeedItem,
  type LeaderboardEntry,
  type SkinId,
  type RemoteDeathPayload,
  SKINS,
} from "./types";
import { SpatialGrid } from "./spatial-grid";
import { updateBotAI, getRandomBotProfile } from "./bot-ai";
import { audio } from "./audio";

export const ARENA_RADIUS = 2800;
const MIN_BOTS = 18;
const MAX_FOODS = 850;
const MAX_POWERUPS = 8;
const INITIAL_SCORE = 30;

export class UrethraEngine {
  public maggots: Maggot[] = [];
  public foods: FoodItem[] = [];
  public powerUps: PowerUpItem[] = [];
  public particles: Particle[] = [];
  public shockwaves: ShockwaveRing[] = [];
  public floatingTexts: FloatingText[] = [];
  public killFeed: KillFeedItem[] = [];
  public spatialGrid = new SpatialGrid(140);
  public deadMaggotIds = new Set<string>();

  public player: Maggot | null = null;
  public isRunning = false;
  public gameOver = false;
  public isHost = true;

  private nextFoodId = 1;
  private nextPowerUpId = 1;
  private nextTextId = 1;
  private gameStartTime = 0;
  private lastTime = 0;
  private lastFoodRespawn = 0;
  private lastPowerUpRespawn = 0;

  // Callbacks
  public onGameOver?: (stats: {
    score: number;
    coffeeEaten: number;
    kills: number;
    timeAlive: number;
    finalRank: number;
  }) => void;
  public onKill?: (killer: string, victim: string) => void;
  public onPlayerDeathBroadcast?: (payload: RemoteDeathPayload) => void;
  public onLeaderboardUpdate?: (entries: LeaderboardEntry[]) => void;

  constructor() {
    // Ready
  }

  public resetLastTime() {
    this.lastTime = performance.now();
  }

  public isMaggotDead(id: string): boolean {
    if (this.deadMaggotIds.has(id)) return true;
    const m = this.maggots.find((item) => item.id === id);
    return m ? !m.alive : false;
  }

  public start(playerName: string, playerSkin: SkinId) {
    this.maggots = [];
    this.foods = [];
    this.powerUps = [];
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.killFeed = [];
    this.deadMaggotIds.clear();
    this.gameOver = false;
    this.isRunning = true;
    this.gameStartTime = Date.now();
    this.lastTime = performance.now();

    // 1. Initial food & powerups spawn
    this.spawnInitialFood();
    this.spawnInitialPowerUps();

    // 2. Spawn initial bots with spread out positions
    for (let i = 0; i < MIN_BOTS; i++) {
      this.spawnBot();
    }

    // 3. Spawn player in safe position
    const spawnPos = this.findSafeSpawnPosition(500);
    this.player = this.createMaggot(
      "player",
      playerName,
      playerSkin,
      true,
      false,
      spawnPos.x,
      spawnPos.y,
      spawnPos.angle,
      3500
    );
    this.maggots.push(this.player);

    this.spatialGrid.rebuild(this.foods);
  }

  public stop() {
    this.isRunning = false;
    audio.stopTurbo();
  }

  public setPlayerTargetAngle(angle: number) {
    if (this.player && this.player.alive) {
      this.player.targetAngle = angle;
    }
  }

  public setPlayerBoosting(boosting: boolean) {
    if (this.player && this.player.alive) {
      const hasFreeTurbo = this.hasBuff(this.player, "turbo");
      if (boosting && (this.player.score > 25 || hasFreeTurbo)) {
        if (!this.player.isBoosting) {
          audio.startTurbo();
        }
        this.player.isBoosting = true;
      } else {
        if (this.player.isBoosting) {
          audio.stopTurbo();
        }
        this.player.isBoosting = false;
      }
    }
  }

  public hasBuff(maggot: Maggot, type: BuffType): boolean {
    const now = performance.now();
    return maggot.activeBuffs.some((b) => b.type === type && b.expiresAt > now);
  }

  private findSafeSpawnPosition(minDist = 450): { x: number; y: number; angle: number } {
    let bestX = 0;
    let bestY = 0;
    let maxFoundDist = -1;

    for (let attempt = 0; attempt < 25; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(0.04 + Math.random() * 0.75) * (ARENA_RADIUS - 400);
      const testX = Math.cos(angle) * r;
      const testY = Math.sin(angle) * r;

      let nearestDist = Infinity;
      for (let i = 0; i < this.maggots.length; i++) {
        const m = this.maggots[i];
        if (!m.alive) continue;
        const d = Math.hypot(m.x - testX, m.y - testY);
        if (d < nearestDist) {
          nearestDist = d;
        }
      }

      if (nearestDist >= minDist) {
        return { x: testX, y: testY, angle: Math.random() * Math.PI * 2 };
      }

      if (nearestDist > maxFoundDist) {
        maxFoundDist = nearestDist;
        bestX = testX;
        bestY = testY;
      }
    }

    return { x: bestX, y: bestY, angle: Math.random() * Math.PI * 2 };
  }

  public createMaggot(
    id: string,
    name: string,
    skin: SkinId,
    isPlayer: boolean,
    isBot: boolean,
    startX?: number,
    startY?: number,
    startAngle?: number,
    invulnMs: number = 2000
  ): Maggot {
    const angle = startAngle !== undefined ? startAngle : Math.random() * Math.PI * 2;
    let x = startX;
    let y = startY;

    if (x === undefined || y === undefined) {
      const safe = this.findSafeSpawnPosition(400);
      x = safe.x;
      y = safe.y;
    }

    const initialScore = isPlayer ? INITIAL_SCORE : Math.floor(25 + Math.random() * 180);
    const initialRadius = this.calculateRadius(initialScore);
    const initialSegmentsCount = this.calculateSegmentCount(initialScore);

    const segments: Segment[] = [];
    for (let i = 0; i < initialSegmentsCount; i++) {
      segments.push({
        x: x - Math.cos(angle) * (i * (initialRadius * 0.65)),
        y: y - Math.sin(angle) * (i * (initialRadius * 0.65)),
        radius: initialRadius,
      });
    }

    const skinDef = SKINS[skin] || SKINS.classic;

    return {
      id,
      name,
      isBot,
      isPlayer,
      skin,
      x,
      y,
      angle,
      targetAngle: angle,
      targetX: x,
      targetY: y,
      speed: 3.8,
      baseSpeed: 3.8,
      boostSpeed: 7.2,
      isBoosting: false,
      score: initialScore,
      coffeeEaten: 0,
      kills: 0,
      segments,
      segmentSpacing: initialRadius * 0.65,
      alive: true,
      lastBoostDropTime: 0,
      turnRate: 0.12,
      glowColor: skinDef.glowColor,
      invulnerableUntil: performance.now() + invulnMs,
      activeBuffs: [],
    };
  }

  private spawnBot() {
    const profile = getRandomBotProfile();
    const botId = `bot_${Math.random().toString(36).substring(2, 9)}`;
    const safe = this.findSafeSpawnPosition(350);
    const bot = this.createMaggot(botId, profile.name, profile.skin, false, true, safe.x, safe.y, safe.angle, 2500);
    this.maggots.push(bot);
  }

  private spawnInitialFood() {
    for (let i = 0; i < MAX_FOODS; i++) {
      this.spawnSingleFood();
    }
  }

  private spawnInitialPowerUps() {
    for (let i = 0; i < MAX_POWERUPS; i++) {
      this.spawnSinglePowerUp();
    }
  }

  public spawnSinglePowerUp(atX?: number, atY?: number, forcedType?: BuffType) {
    const types: BuffType[] = ["magnet", "ghost", "turbo", "multiplier", "shockwave"];
    const type = forcedType || types[Math.floor(Math.random() * types.length)];
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(0.1 + Math.random() * 0.8) * (ARENA_RADIUS - 200);

    const x = atX !== undefined ? atX : Math.cos(angle) * r;
    const y = atY !== undefined ? atY : Math.sin(angle) * r;

    const durations: Record<BuffType, number> = {
      magnet: 8000,
      ghost: 5000,
      turbo: 7000,
      multiplier: 10000,
      shockwave: 0,
    };

    this.powerUps.push({
      id: this.nextPowerUpId++,
      x,
      y,
      radius: 18,
      type,
      durationMs: durations[type],
      pulsePhase: Math.random() * Math.PI * 2,
    });
  }

  public spawnSingleFood(
    atX?: number,
    atY?: number,
    forcedType?: FoodType,
    forcedValue?: number,
    vx?: number,
    vy?: number
  ) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * (ARENA_RADIUS - 80);
    const x = atX !== undefined ? atX : Math.cos(angle) * r;
    const y = atY !== undefined ? atY : Math.sin(angle) * r;

    let type: FoodType = forcedType || "granule";
    let value = forcedValue || 1;
    let radius = 6;
    let color = "#d4af37";
    let glow: string | undefined = undefined;

    if (!forcedType) {
      const roll = Math.random();
      if (roll < 0.55) {
        type = "granule";
        value = 1;
        radius = 5.5;
        color = "#e5c158";
      } else if (roll < 0.85) {
        type = "bean";
        value = 3;
        radius = 8;
        color = "#4e342e";
      } else if (roll < 0.95) {
        type = "drop";
        value = 5;
        radius = 9.5;
        color = "#3e2723";
        glow = "rgba(78, 52, 46, 0.5)";
      } else if (roll < 0.985) {
        type = "carrot";
        value = 18;
        radius = 14;
        color = "#ff7a17";
        glow = "rgba(255, 122, 23, 0.6)";
      } else {
        type = "sadoczyk";
        value = 35;
        radius = 16;
        color = "#4caf50";
        glow = "rgba(76, 175, 80, 0.6)";
      }
    } else {
      if (type === "carrot") {
        radius = Math.min(22, 12 + value * 0.3);
        color = "#ff7a17";
        glow = "rgba(255, 122, 23, 0.6)";
      } else if (type === "sadoczyk") {
        radius = Math.min(24, 14 + value * 0.25);
        color = "#4caf50";
        glow = "rgba(76, 175, 80, 0.6)";
      } else if (type === "drop") {
        radius = Math.min(18, 8 + value * 0.4);
        color = "#3e2723";
        glow = "rgba(78, 52, 46, 0.5)";
      } else if (type === "bean") {
        radius = Math.min(16, 7 + value * 0.3);
        color = "#4e342e";
      } else {
        radius = Math.min(14, 5 + value * 0.35);
        color = "#e5c158";
        glow = value > 10 ? "rgba(229, 193, 88, 0.6)" : undefined;
      }
    }

    const food: FoodItem = {
      id: this.nextFoodId++,
      x,
      y,
      radius,
      type,
      value,
      color,
      glow,
      pulsePhase: Math.random() * Math.PI * 2,
      vx,
      vy,
    };

    this.foods.push(food);
  }

  public calculateRadius(score: number): number {
    return Math.min(36, 13 + Math.pow(score, 0.35) * 1.5);
  }

  public calculateSegmentCount(score: number): number {
    return Math.min(180, Math.floor(12 + Math.pow(score, 0.46) * 3.8));
  }

  public update() {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // 1. Maintain Bot Count (host handles bots)
    let activeBots = 0;
    for (let i = 0; i < this.maggots.length; i++) {
      if (this.maggots[i].isBot && this.maggots[i].alive) activeBots++;
    }
    if (activeBots < MIN_BOTS) {
      this.spawnBot();
    }

    // 2. Maintain Food & Powerups Count
    if (now - this.lastFoodRespawn > 350) {
      this.lastFoodRespawn = now;
      if (this.foods.length < MAX_FOODS) {
        const toSpawn = Math.min(25, MAX_FOODS - this.foods.length);
        for (let i = 0; i < toSpawn; i++) {
          this.spawnSingleFood();
        }
      }
    }

    if (now - this.lastPowerUpRespawn > 4000) {
      this.lastPowerUpRespawn = now;
      if (this.powerUps.length < MAX_POWERUPS) {
        this.spawnSinglePowerUp();
      }
    }

    // 3. Update Kinetic Foods
    for (let i = 0; i < this.foods.length; i++) {
      const f = this.foods[i];
      if (f.vx || f.vy) {
        f.x += (f.vx || 0) * 60 * dt;
        f.y += (f.vy || 0) * 60 * dt;
        f.vx = (f.vx || 0) * 0.92;
        f.vy = (f.vy || 0) * 0.92;
        if (Math.abs(f.vx) < 0.05) f.vx = undefined;
        if (Math.abs(f.vy) < 0.05) f.vy = undefined;
      }
    }

    // 4. Clean Expired Buffs
    for (let i = 0; i < this.maggots.length; i++) {
      const m = this.maggots[i];
      if (m.activeBuffs.length > 0) {
        m.activeBuffs = m.activeBuffs.filter((b) => b.expiresAt > now);
      }
    }

    // 5. Magnet Buffs: pull nearby foods to head
    for (let i = 0; i < this.maggots.length; i++) {
      const m = this.maggots[i];
      if (!m.alive || !this.hasBuff(m, "magnet")) continue;

      const head = m.segments[0] || m;
      const magRadius = 380;
      for (let f = 0; f < this.foods.length; f++) {
        const food = this.foods[f];
        const dx = head.x - food.x;
        const dy = head.y - food.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < magRadius * magRadius) {
          const dist = Math.sqrt(distSq);
          if (dist > 1) {
            const pullSpeed = 500 * dt;
            food.x += (dx / dist) * pullSpeed;
            food.y += (dy / dist) * pullSpeed;
          }
        }
      }
    }

    // 6. Fast Rebuild Spatial Grid for food
    this.spatialGrid.rebuild(this.foods);

    // 7. Update Bots AI
    for (let i = 0; i < this.maggots.length; i++) {
      const maggot = this.maggots[i];
      if (maggot.isBot && maggot.alive) {
        updateBotAI(maggot, this.maggots, this.foods, ARENA_RADIUS);
      }
    }

    // 8. Update Movements & Segments at 60 FPS
    for (let i = 0; i < this.maggots.length; i++) {
      const maggot = this.maggots[i];
      if (!maggot.alive || this.deadMaggotIds.has(maggot.id)) continue;
      this.updateMaggotMovement(maggot, dt, now);
    }

    // 9. Food & PowerUp Collisions
    this.checkFoodCollisions();
    this.checkPowerUpCollisions(now);

    // 10. Authoritative Head Collisions (Zero-duplication)
    this.checkMaggotCollisions(now);

    // 11. Update Shockwaves & Particles
    this.updateShockwaves(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);

    // 12. Clean dead maggots and killfeed
    this.maggots = this.maggots.filter((m) => m.alive || (now - (m.deathTime || 0) < 1500));
    const curTime = Date.now();
    this.killFeed = this.killFeed.filter((k) => curTime - k.time < 6000);
  }

  private updateMaggotMovement(maggot: Maggot, dt: number, now: number) {
    const hasTurboBuff = this.hasBuff(maggot, "turbo");
    const isBoosting = maggot.isBoosting && (maggot.score > 25 || hasTurboBuff);
    const speedMultiplier = hasTurboBuff ? 1.35 : 1.0;
    const currentSpeed = (isBoosting ? maggot.boostSpeed : maggot.baseSpeed) * speedMultiplier;
    const currentRadius = this.calculateRadius(maggot.score);
    const targetSegmentCount = this.calculateSegmentCount(maggot.score);

    // 1. Local Player & Bots Rotation & Movement
    if (maggot.isPlayer || maggot.isBot) {
      let diff = maggot.targetAngle - maggot.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const turnFactor = Math.max(0.04, 0.14 - Math.pow(maggot.score, 0.28) * 0.015);
      maggot.angle += diff * turnFactor;

      const moveDist = currentSpeed * 60 * dt;
      maggot.x += Math.cos(maggot.angle) * moveDist;
      maggot.y += Math.sin(maggot.angle) * moveDist;
    } else {
      // 2. Remote Players 60 FPS Dead Reckoning Interpolation
      let diff = maggot.targetAngle - maggot.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      maggot.angle += diff * 0.22;

      if (maggot.targetX !== undefined && maggot.targetY !== undefined) {
        maggot.x += (maggot.targetX - maggot.x) * 0.25;
        maggot.y += (maggot.targetY - maggot.y) * 0.25;
      }
      const moveDist = currentSpeed * 60 * dt;
      maggot.x += Math.cos(maggot.angle) * moveDist;
      maggot.y += Math.sin(maggot.angle) * moveDist;
    }

    // Turbo mass consumption & trails
    if (isBoosting) {
      if (!hasTurboBuff && (maggot.isPlayer || maggot.isBot)) {
        const burnRate = 2.4 * dt;
        maggot.score = Math.max(25, maggot.score - burnRate);
      }

      if (now - maggot.lastBoostDropTime > 90) {
        maggot.lastBoostDropTime = now;
        const tail = maggot.segments[maggot.segments.length - 1] || maggot;
        const dropX = tail.x + (Math.random() - 0.5) * 16;
        const dropY = tail.y + (Math.random() - 0.5) * 16;
        this.spawnSingleFood(dropX, dropY, "granule", 1);

        if (this.particles.length < 120) {
          this.particles.push({
            x: tail.x,
            y: tail.y,
            vx: -Math.cos(maggot.angle) * 4 + (Math.random() - 0.5) * 3,
            vy: -Math.sin(maggot.angle) * 4 + (Math.random() - 0.5) * 3,
            life: 0.35,
            maxLife: 0.35,
            size: hasTurboBuff ? 11 : 6,
            color: hasTurboBuff ? "#ff5252" : (maggot.glowColor || "rgba(212, 175, 55, 0.8)"),
            type: "trail",
          });
        }
      }
    }

    // Arena boundary clamp
    const distFromCenter = Math.hypot(maggot.x, maggot.y);
    if (distFromCenter > ARENA_RADIUS - currentRadius) {
      const boundaryAngle = Math.atan2(maggot.y, maggot.x);
      maggot.x = Math.cos(boundaryAngle) * (ARENA_RADIUS - currentRadius);
      maggot.y = Math.sin(boundaryAngle) * (ARENA_RADIUS - currentRadius);
      maggot.targetAngle = boundaryAngle + Math.PI + (Math.random() - 0.5) * 0.6;
    }

    // Segments follow with smooth inverse kinematics locally for ALL maggots
    if (maggot.segments.length === 0) {
      maggot.segments.push({ x: maggot.x, y: maggot.y, radius: currentRadius });
    } else {
      maggot.segments[0].x = maggot.x;
      maggot.segments[0].y = maggot.y;
      maggot.segments[0].radius = currentRadius;
    }

    while (maggot.segments.length < targetSegmentCount) {
      const last = maggot.segments[maggot.segments.length - 1];
      maggot.segments.push({ x: last.x, y: last.y, radius: currentRadius });
    }
    while (maggot.segments.length > targetSegmentCount && maggot.segments.length > 5) {
      maggot.segments.pop();
    }

    maggot.segmentSpacing = currentRadius * 0.65;
    for (let s = 1; s < maggot.segments.length; s++) {
      const prev = maggot.segments[s - 1];
      const cur = maggot.segments[s];

      const dx = prev.x - cur.x;
      const dy = prev.y - cur.y;
      const dist = Math.hypot(dx, dy);

      if (dist > maggot.segmentSpacing) {
        const factor = (dist - maggot.segmentSpacing) / dist;
        cur.x += dx * factor;
        cur.y += dy * factor;
      }

      const taper = 1 - (s / maggot.segments.length) * 0.35;
      cur.radius = Math.max(7, currentRadius * taper);
    }
  }

  private checkFoodCollisions() {
    const eatenFoodIds = new Set<number>();

    for (let i = 0; i < this.maggots.length; i++) {
      const maggot = this.maggots[i];
      if (!maggot.alive || this.deadMaggotIds.has(maggot.id)) continue;

      const head = maggot.segments[0] || maggot;
      const eatRadius = head.radius + 18;
      const nearbyFoods = this.spatialGrid.queryNearby(head.x, head.y, eatRadius);

      const hasMultiplier = this.hasBuff(maggot, "multiplier");
      const multiplier = hasMultiplier ? 2 : 1;

      for (let f = 0; f < nearbyFoods.length; f++) {
        const food = nearbyFoods[f];
        if (eatenFoodIds.has(food.id)) continue;

        eatenFoodIds.add(food.id);
        const gain = food.value * multiplier;
        maggot.score += gain;
        maggot.coffeeEaten += 1;

        if (maggot.isPlayer) {
          audio.playEat(food.type);
          if (food.value >= 8 || hasMultiplier) {
            this.addFloatingText(food.x, food.y, `+${gain}`, hasMultiplier ? "#ffd700" : food.color);
          }
        }
      }
    }

    if (eatenFoodIds.size > 0) {
      this.foods = this.foods.filter((f) => !eatenFoodIds.has(f.id));
    }
  }

  private checkPowerUpCollisions(now: number) {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];

      for (let m = 0; m < this.maggots.length; m++) {
        const maggot = this.maggots[m];
        if (!maggot.alive || this.deadMaggotIds.has(maggot.id)) continue;

        const head = maggot.segments[0] || maggot;
        const dx = head.x - pu.x;
        const dy = head.y - pu.y;
        const distSq = dx * dx + dy * dy;
        const hitRadius = head.radius + pu.radius + 10;

        if (distSq < hitRadius * hitRadius) {
          this.applyBuff(maggot, pu, now);
          this.powerUps.splice(i, 1);
          break;
        }
      }
    }
  }

  private applyBuff(maggot: Maggot, pu: PowerUpItem, now: number) {
    if (pu.type === "shockwave") {
      this.triggerShockwave(pu.x, pu.y, 450, "#ffffff");
      if (maggot.isPlayer) {
        audio.playKill();
        this.addFloatingText(pu.x, pu.y, "БАБАХ! ШОКОВА ХВИЛЯ", "#ffffff");
      }
      return;
    }

    maggot.activeBuffs.push({
      type: pu.type,
      expiresAt: now + pu.durationMs,
      durationMs: pu.durationMs,
    });

    const buffNames: Record<BuffType, string> = {
      magnet: "КАВОВИЙ МАГНІТ (8s)",
      ghost: "ФАНТОМ-РЕЖИМ (5s)",
      turbo: "ЕСПРЕСО-ФОРСАЖ (7s)",
      multiplier: "2X МАСА (10s)",
      shockwave: "БАБАХ!",
    };

    if (maggot.isPlayer) {
      audio.playEat("sadoczyk");
      this.addFloatingText(maggot.x, maggot.y - 30, buffNames[pu.type], "#00e5ff");
    }
  }

  private triggerShockwave(x: number, y: number, radius: number, color: string) {
    this.shockwaves.push({
      x,
      y,
      radius: 20,
      maxRadius: radius,
      life: 0.6,
      maxLife: 0.6,
      color,
    });

    for (let i = 0; i < this.maggots.length; i++) {
      const m = this.maggots[i];
      if (!m.alive || this.deadMaggotIds.has(m.id)) continue;
      const dx = m.x - x;
      const dy = m.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist < radius && dist > 1) {
        const force = (1 - dist / radius) * 180;
        m.x += (dx / dist) * force;
        m.y += (dy / dist) * force;
      }
    }
  }

  /**
   * Self-authoritative collision checks:
   * Local client only checks if local player's OWN head hits another body.
   * If local player is Host, also checks local bots' heads.
   */
  private checkMaggotCollisions(now: number) {
    const attackers: Maggot[] = [];
    if (this.player && this.player.alive && !this.deadMaggotIds.has(this.player.id)) {
      attackers.push(this.player);
    }
    if (this.isHost) {
      for (let i = 0; i < this.maggots.length; i++) {
        const m = this.maggots[i];
        if (m.isBot && m.alive && !this.deadMaggotIds.has(m.id)) {
          attackers.push(m);
        }
      }
    }

    for (let a = 0; a < attackers.length; a++) {
      const maggotA = attackers[a];
      if (!maggotA.alive || this.deadMaggotIds.has(maggotA.id)) continue;

      if ((maggotA.invulnerableUntil && now < maggotA.invulnerableUntil) || this.hasBuff(maggotA, "ghost")) {
        continue;
      }

      const headA = maggotA.segments[0] || maggotA;

      for (let j = 0; j < this.maggots.length; j++) {
        const maggotB = this.maggots[j];
        if (maggotA.id === maggotB.id || !maggotB.alive || this.deadMaggotIds.has(maggotB.id)) continue;

        if (maggotB.invulnerableUntil && now < maggotB.invulnerableUntil) {
          continue;
        }

        // Fast bounding circle culling
        const bHead = maggotB.segments[0] || maggotB;
        const approxReach = maggotB.segments.length * (bHead.radius * 0.75) + 60;
        const distToBHeadSq = (headA.x - bHead.x) * (headA.x - bHead.x) + (headA.y - bHead.y) * (headA.y - bHead.y);
        if (distToBHeadSq > approxReach * approxReach) {
          continue;
        }

        const bSegments = maggotB.segments;
        for (let s = 1; s < bSegments.length; s++) {
          const segB = bSegments[s];
          const dx = headA.x - segB.x;
          const dy = headA.y - segB.y;
          const distSq = dx * dx + dy * dy;
          const hitDist = headA.radius + segB.radius - 3;

          if (distSq < hitDist * hitDist) {
            this.handleAuthoritativeKill(maggotA, maggotB);
            break;
          }
        }

        if (!maggotA.alive) break;
      }
    }
  }

  private handleAuthoritativeKill(victim: Maggot, killer: Maggot) {
    if (!victim.alive || this.deadMaggotIds.has(victim.id)) return;

    // 1. Prepare deterministic drop payload
    const totalDropMass = Math.max(40, Math.floor(victim.score * 0.8));
    const segCount = victim.segments.length;
    let distributedMass = 0;
    const droppedFoods: RemoteDeathPayload["droppedFoods"] = [];

    for (let s = 0; s < segCount; s++) {
      if (distributedMass >= totalDropMass) break;
      const seg = victim.segments[s];

      const burstAngle = Math.random() * Math.PI * 2;
      const burstSpeed = 3 + Math.random() * 8;
      const vx = Math.cos(burstAngle) * burstSpeed;
      const vy = Math.sin(burstAngle) * burstSpeed;

      let foodType: FoodType = "granule";
      let foodVal = 5;

      const roll = Math.random();
      if (victim.score > 400 && roll < 0.2) {
        foodType = "sadoczyk";
        foodVal = 40;
      } else if (victim.score > 200 && roll < 0.35) {
        foodType = "carrot";
        foodVal = 25;
      } else if (roll < 0.6) {
        foodType = "drop";
        foodVal = 12;
      } else {
        foodType = "bean";
        foodVal = 6;
      }

      droppedFoods.push({
        x: seg.x,
        y: seg.y,
        type: foodType,
        value: foodVal,
        vx,
        vy,
      });
      distributedMass += foodVal;
    }

    const payload: RemoteDeathPayload = {
      victimId: victim.id,
      victimName: victim.name,
      killerId: killer.id,
      killerName: killer.name,
      killerSkin: killer.skin,
      x: victim.x,
      y: victim.y,
      score: victim.score,
      droppedFoods,
      spawnPowerUp: victim.score >= 180,
    };

    // Execute death locally
    this.killMaggot(victim, killer);

    // Broadcast if player died
    if (victim.isPlayer) {
      this.onPlayerDeathBroadcast?.(payload);
    }
  }

  public applyRemoteDeath(payload: RemoteDeathPayload) {
    if (this.deadMaggotIds.has(payload.victimId)) return;
    this.deadMaggotIds.add(payload.victimId);

    const victim = this.maggots.find((m) => m.id === payload.victimId);
    if (victim) {
      victim.alive = false;
      victim.deathTime = performance.now();
    }

    // If local player is the killer, claim massive reward
    if (this.player && payload.killerId === this.player.id) {
      const bounty = Math.max(30, Math.floor(payload.score * 0.4));
      this.player.kills += 1;
      this.player.score += bounty;
      audio.playKill();
      this.addFloatingText(payload.x, payload.y, `+${bounty}g ДЖЕКПОТ!`, "#ffd700");
    }

    // Shockwave
    this.shockwaves.push({
      x: payload.x,
      y: payload.y,
      radius: 10,
      maxRadius: Math.min(350, 90 + payload.score * 0.45),
      life: 0.7,
      maxLife: 0.7,
      color: "rgba(212, 175, 55, 0.9)",
    });

    // Spawn exact dropped food items
    for (let i = 0; i < payload.droppedFoods.length; i++) {
      const df = payload.droppedFoods[i];
      this.spawnSingleFood(df.x, df.y, df.type, df.value, df.vx, df.vy);
    }

    if (payload.spawnPowerUp) {
      this.spawnSinglePowerUp(payload.x, payload.y);
    }

    this.addKillFeed(payload.killerName || "Опариш", payload.victimName, payload.killerSkin);
  }

  public killMaggot(victim: Maggot, killer?: Maggot) {
    if (!victim.alive || this.deadMaggotIds.has(victim.id)) return;
    this.deadMaggotIds.add(victim.id);
    victim.alive = false;
    victim.deathTime = performance.now();

    if (victim.isPlayer) {
      audio.stopTurbo();
      audio.playDeath();
    }

    // 1. Direct Kill Bounty
    if (killer && killer.alive && !this.deadMaggotIds.has(killer.id)) {
      killer.kills += 1;
      const killBounty = Math.max(30, Math.floor(victim.score * 0.4));
      killer.score += killBounty;
      if (killer.isPlayer) {
        audio.playKill();
        this.addFloatingText(victim.x, victim.y, `+${killBounty}g ДЖЕКПОТ!`, "#ffd700");
      }
      this.addKillFeed(killer.name, victim.name, killer.skin);
      this.onKill?.(killer.name, victim.name);
    }

    // 2. Shockwave burst
    this.shockwaves.push({
      x: victim.x,
      y: victim.y,
      radius: 10,
      maxRadius: Math.min(350, 90 + victim.score * 0.45),
      life: 0.7,
      maxLife: 0.7,
      color: "rgba(212, 175, 55, 0.9)",
    });

    if (victim.score >= 180) {
      this.spawnSinglePowerUp(victim.x, victim.y);
    }

    // 3. Loot drops
    const totalDropMass = Math.max(40, Math.floor(victim.score * 0.8));
    const segCount = victim.segments.length;
    let distributedMass = 0;

    for (let s = 0; s < segCount; s++) {
      if (distributedMass >= totalDropMass) break;
      const seg = victim.segments[s];

      const burstAngle = Math.random() * Math.PI * 2;
      const burstSpeed = 3 + Math.random() * 8;
      const vx = Math.cos(burstAngle) * burstSpeed;
      const vy = Math.sin(burstAngle) * burstSpeed;

      let foodType: FoodType = "granule";
      let foodVal = 5;

      const roll = Math.random();
      if (victim.score > 400 && roll < 0.2) {
        foodType = "sadoczyk";
        foodVal = 40;
      } else if (victim.score > 200 && roll < 0.35) {
        foodType = "carrot";
        foodVal = 25;
      } else if (roll < 0.6) {
        foodType = "drop";
        foodVal = 12;
      } else {
        foodType = "bean";
        foodVal = 6;
      }

      this.spawnSingleFood(seg.x, seg.y, foodType, foodVal, vx, vy);
      distributedMass += foodVal;

      if (this.particles.length < 120 && s % 2 === 0) {
        this.particles.push({
          x: seg.x,
          y: seg.y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 0.5,
          maxLife: 0.5,
          size: 6 + Math.random() * 6,
          color: s % 2 === 0 ? "#4e342e" : "#d4af37",
          type: "blood",
        });
      }
    }

    if (victim.isPlayer) {
      this.gameOver = true;
      const finalRank = this.getLeaderboard().findIndex((e) => e.isPlayer) + 1;
      const timeAlive = Math.floor((Date.now() - this.gameStartTime) / 1000);
      this.onGameOver?.({
        score: Math.floor(victim.score),
        coffeeEaten: victim.coffeeEaten,
        kills: victim.kills,
        timeAlive,
        finalRank: finalRank || this.maggots.length + 1,
      });
    }
  }

  private addKillFeed(killer: string, victim: string, killerSkin: SkinId) {
    const now = Date.now();
    const existing = this.killFeed.find(
      (k) => k.killer === killer && k.victim === victim && now - k.time < 3500
    );
    if (existing) return;

    this.killFeed.unshift({
      id: `${now}_${Math.random()}`,
      killer,
      victim,
      time: now,
      killerSkin,
    });
    if (this.killFeed.length > 5) {
      this.killFeed.pop();
    }
  }

  private addFloatingText(x: number, y: number, text: string, color: string) {
    this.floatingTexts.push({
      id: this.nextTextId++,
      x,
      y,
      text,
      color,
      life: 1.2,
      maxLife: 1.2,
      vy: -1.2,
    });
  }

  private updateShockwaves(dt: number) {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      sw.radius += (sw.maxRadius - sw.radius) * 8 * dt;
      if (sw.life <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * 60 * dt;
      p.y += p.vy * 60 * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * 60 * dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  public getLeaderboard(): LeaderboardEntry[] {
    const list: LeaderboardEntry[] = this.maggots
      .filter((m) => m.alive && !this.deadMaggotIds.has(m.id))
      .map((m) => ({
        id: m.id,
        name: m.name,
        score: Math.floor(m.score),
        isPlayer: m.isPlayer,
        isBot: m.isBot,
        isLive: !m.isBot && !m.isPlayer,
        skin: m.skin,
      }))
      .sort((a, b) => b.score - a.score);

    return list.slice(0, 10);
  }
}
