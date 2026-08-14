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
          try {
            if (payload && typeof payload === "object") {
              this.handleRemoteSync(payload as RemotePlayerSync);
            }
          } catch (e) {
            console.error("Error handling player_sync:", e);
          }
        })
        .on("broadcast", { event: "player_death" }, ({ payload }) => {
          try {
            if (payload && typeof payload === "object") {
              this.handleRemoteDeath(payload as RemoteDeathPayload);
            }
          } catch (e) {
            console.error("Error handling player_death:", e);
          }
        })
        .on("presence", { event: "sync" }, () => {
          try {
            const presenceState = channel.presenceState();
            const userKeys = Object.keys(presenceState).sort();
            this.onlineUsersCount = Math.max(1, userKeys.length);
            this.isHost = userKeys[0] === localPlayerId;
            this.engine.isHost = this.isHost;
            this.onOnlineCountChange?.(this.onlineUsersCount);
          } catch (e) {
            console.error("Error handling presence sync:", e);
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            try {
              await channel.track({
                user: playerName,
                id: localPlayerId,
                skin: playerSkin,
                online_at: new Date().toISOString(),
              });
              this.startBroadcasting(playerName, playerSkin);
              this.startCleanupTimer();
            } catch (e) {
              console.error("Error tracking presence:", e);
            }
          }
        });

      this.channel = channel;
    } catch (e) {
      console.error("Multiplayer connection fallback:", e);
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

    // 60ms broadcast rate
    this.broadcastInterval = window.setInterval(() => {
      try {
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
          activeBuffs: p.activeBuffs ? p.activeBuffs.map((b) => b.type) : [],
          alive: p.alive,
          t: Date.now(),
        };

        this.channel.send({
          type: "broadcast",
          event: "player_sync",
          payload,
        });
      } catch {}
    }, 60);
  }

  private startCleanupTimer() {
    if (this.cleanupInterval) {
      window.clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = window.setInterval(() => {
      try {
        const now = Date.now();
        for (const [id, data] of this.remotePlayers.entries()) {
          if (now - data.lastSeen > 3500) {
            this.remotePlayers.delete(id);
            this.engine.maggots = this.engine.maggots.filter((m) => m.id !== id);
          }
        }
      } catch {}
    }, 1000);
  }

  private handleRemoteSync(payload: RemotePlayerSync) {
    if (!payload || !payload.id || payload.id === this.localPlayerId) return;
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
      const initialRadius = this.engine.calculateRadius(payload.score || 30);
      const initialCount = this.engine.calculateSegmentCount(payload.score || 30);
      const segments = [];
      for (let i = 0; i < initialCount; i++) {
        segments.push({
          x: payload.x - Math.cos(payload.angle || 0) * (i * (initialRadius * 0.65)),
          y: payload.y - Math.sin(payload.angle || 0) * (i * (initialRadius * 0.65)),
          radius: initialRadius,
        });
      }

      remoteMaggot = {
        id: payload.id,
        name: payload.name || "Опариш",
        isBot: false,
        isPlayer: false,
        skin: payload.skin || "classic",
        x: payload.x || 0,
        y: payload.y || 0,
        angle: payload.angle || 0,
        targetAngle: payload.angle || 0,
        targetX: payload.x || 0,
        targetY: payload.y || 0,
        speed: payload.isBoosting ? 7.2 : 3.8,
        baseSpeed: 3.8,
        boostSpeed: 7.2,
        isBoosting: !!payload.isBoosting,
        score: payload.score || 30,
        coffeeEaten: payload.coffeeEaten || 0,
        kills: payload.kills || 0,
        segments,
        segmentSpacing: initialRadius * 0.65,
        alive: true,
        lastBoostDropTime: 0,
        turnRate: 0.14,
        activeBuffs: Array.isArray(payload.activeBuffs)
          ? payload.activeBuffs.map((t) => ({
              type: t,
              expiresAt: performance.now() + 1000,
              durationMs: 1000,
            }))
          : [],
      };
      this.engine.maggots.push(remoteMaggot);
    } else if (remoteMaggot && remoteMaggot.alive) {
      remoteMaggot.targetX = payload.x;
      remoteMaggot.targetY = payload.y;
      remoteMaggot.targetAngle = payload.angle;
      remoteMaggot.isBoosting = !!payload.isBoosting;
      remoteMaggot.score = payload.score || 30;
      remoteMaggot.coffeeEaten = payload.coffeeEaten || 0;
      remoteMaggot.kills = payload.kills || 0;

      const driftDistSq =
        (payload.x - remoteMaggot.x) * (payload.x - remoteMaggot.x) +
        (payload.y - remoteMaggot.y) * (payload.y - remoteMaggot.y);
      if (driftDistSq > 280 * 280) {
        remoteMaggot.x = payload.x;
        remoteMaggot.y = payload.y;
        remoteMaggot.angle = payload.angle;
      }

      remoteMaggot.activeBuffs = Array.isArray(payload.activeBuffs)
        ? payload.activeBuffs.map((t) => ({
            type: t,
            expiresAt: performance.now() + 1000,
            durationMs: 1000,
          }))
        : [];
    }
  }

  private handleRemoteDeath(payload: RemoteDeathPayload) {
    if (!payload || !payload.victimId) return;
    this.engine.applyRemoteDeath(payload);
  }

  public broadcastDeath(payload: RemoteDeathPayload) {
    this.stopBroadcasting();
    if (!this.channel) return;
    try {
      this.channel.send({
        type: "broadcast",
        event: "player_death",
        payload,
      });
    } catch {}
  }
}
