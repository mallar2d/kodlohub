import { createHash, createHmac, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const ARENA_KEY_PREFIX = "ka_live_";
export const PAIR_CODE_TTL_MS = 3 * 60 * 1000;

export type ArenaProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  game_nick: string | null;
};

export function effectiveArenaNick(profile: Pick<ArenaProfile, "game_nick" | "display_name" | "username">): string {
  const nick = (profile.game_nick || profile.display_name || profile.username || "Гравець").trim();
  return nick.slice(0, 32) || "Гравець";
}

export function generateArenaGameToken(): { rawKey: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString("base64url");
  const rawKey = `${ARENA_KEY_PREFIX}${secret}`;
  return {
    rawKey,
    prefix: rawKey.slice(0, 16),
    hash: hashArenaToken(rawKey),
  };
}

export function hashArenaToken(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function generatePairCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += alphabet[bytes[i]! % alphabet.length];
  }
  return code;
}

export function generatePollToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function resolveArenaToken(
  rawKey: string
): Promise<{ tokenId: string; userId: string } | null> {
  if (!rawKey.startsWith(ARENA_KEY_PREFIX)) return null;
  const admin = createAdminClient();
  const keyHash = hashArenaToken(rawKey);
  const { data: token } = await admin
    .from("arena_game_tokens")
    .select("id, user_id, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();
  if (!token || token.revoked_at) return null;
  admin
    .from("arena_game_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", token.id)
    .then(undefined, () => {});
  return { tokenId: token.id, userId: token.user_id };
}

export async function loadArenaProfile(userId: string): Promise<ArenaProfile | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, username, display_name, avatar_url, game_nick")
    .eq("id", userId)
    .maybeSingle();
  return data as ArenaProfile | null;
}

export async function loadOrCreateArenaStats(userId: string) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("kodlo_arena_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing;
  const { data: created } = await admin
    .from("kodlo_arena_stats")
    .upsert(
      {
        user_id: userId,
        frags: 0,
        deaths: 0,
        matches: 0,
        wins: 0,
        playtime_seconds: 0,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();
  return created;
}

export function validateMatchPayload(body: unknown): {
  ok: true;
  data: {
    map_id: string;
    mode_id: string;
    frags: number;
    deaths: number;
    duration_seconds: number;
    result: "win" | "loss" | "draw" | "aborted";
    client_version: string | null;
  };
} | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid JSON body" };
  const b = body as Record<string, unknown>;
  const map_id = String(b.map_id ?? "").toLowerCase().trim();
  const mode_id = String(b.mode_id ?? "ffa").toLowerCase().trim() === "unlimited"
    ? "ffa"
    : String(b.mode_id ?? "ffa").toLowerCase().trim();
  const frags = Number(b.frags ?? 0);
  const deaths = Number(b.deaths ?? 0);
  const duration_seconds = Number(b.duration_seconds ?? 0);
  const resultRaw = String(b.result ?? "aborted");
  const client_version = b.client_version != null ? String(b.client_version).slice(0, 32) : null;

  if (!/^[a-z0-9_]{2,40}$/.test(map_id)) {
    return { ok: false, error: "Unknown map_id" };
  }
  if (!["ffa", "duel"].includes(mode_id)) return { ok: false, error: "Unknown mode_id" };
  if (!Number.isFinite(frags) || frags < 0 || frags > 200) return { ok: false, error: "Invalid frags" };
  if (!Number.isFinite(deaths) || deaths < 0 || deaths > 200) return { ok: false, error: "Invalid deaths" };
  if (!Number.isFinite(duration_seconds) || duration_seconds < 0 || duration_seconds > 7200) {
    return { ok: false, error: "Invalid duration_seconds" };
  }
  if (!["win", "loss", "draw", "aborted"].includes(resultRaw)) {
    return { ok: false, error: "Invalid result" };
  }

  return {
    ok: true,
    data: {
      map_id,
      mode_id,
      frags: Math.floor(frags),
      deaths: Math.floor(deaths),
      duration_seconds: Math.floor(duration_seconds),
      result: resultRaw as "win" | "loss" | "draw" | "aborted",
      client_version,
    },
  };
}

function b64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/** HS256 JWT for Kodlo Arena signaling (iss=kodlohub, aud=kodlo-arena-signaling). */
export async function createSignalingTicket(userId: string, displayName: string): Promise<string> {
  const secret = process.env.KODLO_SIGNALING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("KODLO_SIGNALING_SECRET is not configured");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlJson({ alg: "HS256", typ: "JWT" });
  const payload = b64urlJson({
    sub: userId,
    name: displayName.slice(0, 64),
    iss: "kodlohub",
    aud: "kodlo-arena-signaling",
    iat: now,
    exp: now + 5 * 60,
  });
  const data = `${header}.${payload}`;
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}
