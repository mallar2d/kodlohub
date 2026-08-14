import { createClient } from "@/lib/supabase/client";
import type { RemotePlayerSync, RemoteDeathPayload, SkinId } from "./types";
import type { UrethraEngine } from "./engine";

export class UrethraMultiplayer {
  private engine: UrethraEngine;
  private channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
  private broadcastInterval: number | null = null;
  private cleanupInterval: number | null = null;
  private remotePlayers: Map<string, { sync: RemotePlayerSync; lastSeen: number }> = new Map();
  public localPlayerId: string = "";
  public isHost = false;
  public onlineUsersCount = 1;

  public onOnlineCountChange?: (count: number) => void;

  constructor(engine: UrethraEngine) {
    this.engine = engine;
  }

  public connect(localPlayerId: string, playerName: string, playerSkin: SkinId) {
    this.localPlayerId = localPlayerId;

    try {
      const supabase = createClient();
      const channel = supabase.channel("room:urethra", {
        config: { broadcast: { self: false }, presence: { key: localPlayerId } },
      });

      channel
        .on("broadcast", { event: "player_sync" }, ({ payload }) => {
          this.handleRemoteSync(payload as RemotePlayerSync);
        })
        .on("broadcast", { event: "player_death" }, ({ payload }) => {
          this.handleRemoteDeath(payload as RemoteDeathPayload);
        })
        .on("presence", { event: "sync" }, () => {
          const presenceState = channel.presenceState();
          const userKeys = Object.keys(presenceState).sort();
          this.onlineUsersCount = Math.max(1, userKeys.length);
          this.isHost = userKeys[0] === localPlayerId;
          this.engine.isHost = this.isHost;
          this.onOnlineCountChange?.(this.onlineUsersCount);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({
              user: playerName,
              id: localPlayerId,
              skin: playerSkin,
              online_at: new Date().toISOString(),
            });
            this.startBroadcasting(playerName, playerSkin);
            this.startCleanupTimer();
          }
        });

      this.channel = channel;
    } catch {
      // Offline fallback
    }
  }

  public disconnect() {
    this.stopBroadcasting();

    if (this.cleanupInterval) {
      window.clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.channel) {
      try {
        this.channel.untrack();
        this.channel.unsubscribe();
      } catch {}
      this.channel = null;
    }

    this.remotePlayers.clear();
  }

  public stopBroadcasting() {
    if (this.broadcastInterval) {
      window.clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
  }

  private startBroadcasting(playerName: string, playerSkin: SkinId) {
    this.stopBroadcasting();

    // 60ms broadcast tick (16.6 updates/sec) - crisp sync with minimal payload
    this.broadcastInterval = window.setInterval(() => {
      if (!this.engine.player || !this.engine.player.alive || !this.channel || this.engine.gameOver) {
        return;
      }

      const p = this.engine.player;

      const payload: RemotePlayerSync = {
        id: this.localPlayerId,
        name: playerName,
        skin: playerSkin,
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        angle: Math.round(p.angle * 100) / 100,
        isBoosting: p.isBoosting,
        score: Math.floor(p.score),
        coffeeEaten: p.coffeeEaten,
        kills: p.kills,
        activeBuffs: p.activeBuffs.map((b) => b.type),
        alive: p.alive,
        t: Date.now(),
      };

      this.channel.send({
        type: "broadcast",
        event: "player_sync",
        payload,
      });
    }, 60);
  }

  private startCleanupTimer() {
    if (this.cleanupInterval) {
      window.clearInterval(this.cleanupInterval);
    }

    // Clean inactive remote players if no message received for 3.5s
    this.cleanupInterval = window.setInterval(() => {
      const now = Date.now();
      for (const [id, data] of this.remotePlayers.entries()) {
        if (now - data.lastSeen > 3500) {
          this.remotePlayers.delete(id);
          this.engine.maggots = this.engine.maggots.filter((m) => m.id !== id);
        }
      }
    }, 1000);
  }

  private handleRemoteSync(payload: RemotePlayerSync) {
    if (payload.id === this.localPlayerId) return;
    if (this.engine.isMaggotDead(payload.id)) return;

    if (!payload.alive) {
      const remoteMaggot = this.engine.maggots.find((m) => m.id === payload.id);
      if (remoteMaggot && remoteMaggot.alive) {
        this.engine.killMaggot(remoteMaggot);
      }
      return;
    }

    this.remotePlayers.set(payload.id, {
      sync: payload,
      lastSeen: Date.now(),
    });

    let remoteMaggot = this.engine.maggots.find((m) => m.id === payload.id);

    if (!remoteMaggot && payload.alive) {
      const initialRadius = this.engine.calculateRadius(payload.score);
      const initialCount = this.engine.calculateSegmentCount(payload.score);
      const segments = [];
      for (let i = 0; i < initialCount; i++) {
        segments.push({
          x: payload.x - Math.cos(payload.angle) * (i * (initialRadius * 0.65)),
          y: payload.y - Math.sin(payload.angle) * (i * (initialRadius * 0.65)),
          radius: initialRadius,
        });
      }

      remoteMaggot = {
        id: payload.id,
        name: payload.name,
        isBot: false,
        isPlayer: false,
        skin: payload.skin,
        x: payload.x,
        y: payload.y,
        angle: payload.angle,
        targetAngle: payload.angle,
        targetX: payload.x,
        targetY: payload.y,
        speed: payload.isBoosting ? 7.2 : 3.8,
        baseSpeed: 3.8,
        boostSpeed: 7.2,
        isBoosting: payload.isBoosting,
        score: payload.score,
        coffeeEaten: payload.coffeeEaten,
        kills: payload.kills,
        segments,
        segmentSpacing: initialRadius * 0.65,
        alive: true,
        lastBoostDropTime: 0,
        turnRate: 0.14,
        activeBuffs: (payload.activeBuffs || []).map((t) => ({
          type: t,
          expiresAt: performance.now() + 1000,
          durationMs: 1000,
        })),
      };
      this.engine.maggots.push(remoteMaggot);
    } else if (remoteMaggot && remoteMaggot.alive) {
      // Update targets for dead reckoning
      remoteMaggot.targetX = payload.x;
      remoteMaggot.targetY = payload.y;
      remoteMaggot.targetAngle = payload.angle;
      remoteMaggot.isBoosting = payload.isBoosting;
      remoteMaggot.score = payload.score;
      remoteMaggot.coffeeEaten = payload.coffeeEaten;
      remoteMaggot.kills = payload.kills;

      // Teleport if too far out of sync (lag spike), otherwise let dead reckoning smoothly interpolate
      const driftDistSq = (payload.x - remoteMaggot.x) * (payload.x - remoteMaggot.x) + (payload.y - remoteMaggot.y) * (payload.y - remoteMaggot.y);
      if (driftDistSq > 280 * 280) {
        remoteMaggot.x = payload.x;
        remoteMaggot.y = payload.y;
        remoteMaggot.angle = payload.angle;
      }

      remoteMaggot.activeBuffs = (payload.activeBuffs || []).map((t) => ({
        type: t,
        expiresAt: performance.now() + 1000,
        durationMs: 1000,
      }));
    }
  }

  private handleRemoteDeath(payload: RemoteDeathPayload) {
    this.engine.applyRemoteDeath(payload);
  }

  public broadcastDeath(payload: RemoteDeathPayload) {
    this.stopBroadcasting();
    if (!this.channel) return;
    this.channel.send({
      type: "broadcast",
      event: "player_death",
      payload,
    });
  }
}
