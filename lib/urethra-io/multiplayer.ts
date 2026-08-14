import { createClient } from "@/lib/supabase/client";
import type { RemotePlayerSync, SkinId } from "./types";
import type { UrethraEngine } from "./engine";

export class UrethraMultiplayer {
  private engine: UrethraEngine;
  private channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
  private broadcastInterval: number | null = null;
  private cleanupInterval: number | null = null;
  private remotePlayers: Map<string, { sync: RemotePlayerSync; lastSeen: number }> = new Map();
  private localPlayerId: string = "";
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
          this.handleRemoteDeath(payload as { id: string; killerId?: string });
        })
        .on("presence", { event: "sync" }, () => {
          const presenceState = channel.presenceState();
          const count = Object.keys(presenceState).length;
          this.onlineUsersCount = Math.max(1, count);
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
      // Fallback to local simulation mode silently
    }
  }

  public disconnect() {
    if (this.broadcastInterval) {
      window.clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

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

  private startBroadcasting(playerName: string, playerSkin: SkinId) {
    if (this.broadcastInterval) {
      window.clearInterval(this.broadcastInterval);
    }

    // 85ms broadcast rate (11.7 updates/sec) - optimal balance of precision and zero network latency
    this.broadcastInterval = window.setInterval(() => {
      if (!this.engine.player || !this.engine.player.alive || !this.channel || this.engine.gameOver) {
        return;
      }

      const p = this.engine.player;

      // Downsample segments payload if very long to prevent JSON serialize overhead
      const segs = p.segments;
      const step = segs.length > 80 ? 2 : 1;
      const compactSegments: Array<{ x: number; y: number; radius: number }> = [];

      for (let i = 0; i < segs.length; i += step) {
        compactSegments.push({
          x: Math.round(segs[i].x * 10) / 10,
          y: Math.round(segs[i].y * 10) / 10,
          radius: Math.round(segs[i].radius * 10) / 10,
        });
      }

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
        segments: compactSegments,
        activeBuffs: p.activeBuffs.map((b) => b.type),
        alive: p.alive,
        t: Date.now(),
      };

      this.channel.send({
        type: "broadcast",
        event: "player_sync",
        payload,
      });
    }, 85);
  }

  private startCleanupTimer() {
    if (this.cleanupInterval) {
      window.clearInterval(this.cleanupInterval);
    }

    // Remove inactive remote players if no heartbeat for 3s
    this.cleanupInterval = window.setInterval(() => {
      const now = Date.now();
      for (const [id, data] of this.remotePlayers.entries()) {
        if (now - data.lastSeen > 3000) {
          this.remotePlayers.delete(id);
          this.engine.maggots = this.engine.maggots.filter((m) => m.id !== id);
        }
      }
    }, 1000);
  }

  private handleRemoteSync(payload: RemotePlayerSync) {
    if (payload.id === this.localPlayerId) return;

    // If this remote player is already dead, never resurrect or sync
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
        speed: payload.isBoosting ? 7.2 : 3.8,
        baseSpeed: 3.8,
        boostSpeed: 7.2,
        isBoosting: payload.isBoosting,
        score: payload.score,
        coffeeEaten: payload.coffeeEaten,
        kills: payload.kills,
        segments: payload.segments,
        segmentSpacing: payload.segments[0]?.radius ? payload.segments[0].radius * 0.65 : 12,
        alive: true,
        lastBoostDropTime: 0,
        turnRate: 0.12,
        activeBuffs: (payload.activeBuffs || []).map((t) => ({
          type: t,
          expiresAt: performance.now() + 1000,
          durationMs: 1000,
        })),
      };
      this.engine.maggots.push(remoteMaggot);
    } else if (remoteMaggot && remoteMaggot.alive) {
      // Smooth interpolation for remote maggot coordinates
      remoteMaggot.x += (payload.x - remoteMaggot.x) * 0.6;
      remoteMaggot.y += (payload.y - remoteMaggot.y) * 0.6;
      remoteMaggot.angle = payload.angle;
      remoteMaggot.targetAngle = payload.angle;
      remoteMaggot.isBoosting = payload.isBoosting;
      remoteMaggot.score = payload.score;
      remoteMaggot.coffeeEaten = payload.coffeeEaten;
      remoteMaggot.kills = payload.kills;

      if (payload.segments && payload.segments.length > 0) {
        remoteMaggot.segments = payload.segments;
      }

      remoteMaggot.activeBuffs = (payload.activeBuffs || []).map((t) => ({
        type: t,
        expiresAt: performance.now() + 1000,
        durationMs: 1000,
      }));
    }
  }

  private handleRemoteDeath(payload: { id: string; killerId?: string }) {
    if (this.engine.isMaggotDead(payload.id)) return;
    const maggot = this.engine.maggots.find((m) => m.id === payload.id);
    if (maggot && maggot.alive) {
      const killer = this.engine.maggots.find((m) => m.id === payload.killerId);
      this.engine.killMaggot(maggot, killer);
    }
  }

  public notifyDeath(killerId?: string) {
    if (this.broadcastInterval) {
      window.clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    if (!this.channel) return;
    this.channel.send({
      type: "broadcast",
      event: "player_death",
      payload: { id: this.localPlayerId, killerId },
    });
  }
}
