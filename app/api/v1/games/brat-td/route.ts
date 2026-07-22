import { withApiAuth, requireServiceUser } from "@/lib/api/auth";
import { apiError, apiJson } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { effectiveArenaNick, loadArenaProfile } from "@/lib/arena/auth";
import {
  loadCloudProgress,
  parseProgressPayload,
  saveCloudProgress,
} from "@/lib/brat-td/cloud-progress";
import { handleCorsPreflight } from "@/lib/api/cors";

const LEADERBOARD_LIMIT = 50;

type LeaderboardKind =
  | "best_score"
  | "normal_wave"
  | "hard_wave"
  | "endless_wave"
  | "fastest_victory"
  | "competitive_score"
  | "competitive_fastest";

async function getMe(request: Request, userId: string) {
  const profile = await loadArenaProfile(userId);
  if (!profile) return apiError(request, "Profile not found", 404, "not_found");
  const progress = await loadCloudProgress(userId);
  return apiJson(request, {
    user_id: profile.id,
    username: profile.username,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    game_nick: profile.game_nick,
    effective_nick: effectiveArenaNick(profile),
    progress,
  });
}

export const GET = withApiAuth(async (request, ctx) => {
  const url = new URL(request.url);
  const view = url.searchParams.get("view") || "me";

  if (view === "leaderboard") {
    const admin = createAdminClient();
    const kind = (url.searchParams.get("leaderboard") ?? "best_score") as LeaderboardKind;
    let query = admin
      .from("brat_td_scores")
      .select(
        "user_id, player_name, score, wave, created_at, difficulty, is_endless, duration_seconds, map_id, version, active_title, active_frame"
      )
      .limit(LEADERBOARD_LIMIT);

    if (kind === "normal_wave") {
      query = query
        .eq("difficulty", "normal")
        .order("wave", { ascending: false })
        .order("score", { ascending: false });
    } else if (kind === "hard_wave") {
      query = query
        .eq("difficulty", "hard")
        .order("wave", { ascending: false })
        .order("score", { ascending: false });
    } else if (kind === "endless_wave") {
      query = query
        .eq("is_endless", true)
        .order("wave", { ascending: false })
        .order("score", { ascending: false });
    } else if (kind === "fastest_victory") {
      query = query
        .gte("wave", 60)
        .not("duration_seconds", "is", null)
        .order("duration_seconds", { ascending: true });
    } else if (kind === "competitive_score") {
      query = query
        .eq("difficulty", "competitive")
        .eq("is_endless", false)
        .order("score", { ascending: false })
        .order("duration_seconds", { ascending: true });
    } else if (kind === "competitive_fastest") {
      query = query
        .eq("difficulty", "competitive")
        .eq("is_endless", false)
        .gte("wave", 60)
        .not("duration_seconds", "is", null)
        .order("duration_seconds", { ascending: true })
        .order("score", { ascending: false });
    } else {
      query = query.order("score", { ascending: false });
    }

    const mapId = url.searchParams.get("map_id");
    const version = url.searchParams.get("version");
    if (mapId) query = query.eq("map_id", mapId);
    if (version) query = query.eq("version", version);

    const { data: topRows } = await query;
    const topIds = [...new Set((topRows ?? []).map((r) => r.user_id))];
    const profilesById = new Map<
      string,
      { username: string | null; display_name: string | null; avatar_url: string | null }
    >();
    if (topIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", topIds);
      for (const p of profiles ?? []) profilesById.set(p.id, p);
    }

    const leaderboard = (topRows ?? []).map((row) => {
      const p = profilesById.get(row.user_id);
      return {
        ...row,
        username: p?.username ?? null,
        display_name: p?.display_name ?? null,
        avatar_url: p?.avatar_url ?? null,
      };
    });

    return apiJson(request, { leaderboard, kind });
  }

  const user = requireServiceUser(request, ctx);
  if ("error" in user) return user.error;
  return getMe(request, user.userId);
}, { scopes: ["read"] });

export const PATCH = withApiAuth(async (request, ctx) => {
  const user = requireServiceUser(request, ctx);
  if ("error" in user) return user.error;
  if (ctx.authKind !== "arena_token") {
    return apiError(request, "Only KodloHUB game tokens can sync Brat TD progress", 403, "insufficient_scope");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(request, "Invalid JSON", 400, "bad_request");
  }

  const progress = parseProgressPayload(body);
  if (!progress) return apiError(request, "Invalid progress payload", 400, "bad_request");

  const saved = await saveCloudProgress(user.userId, progress);
  if (!saved.ok) return apiError(request, saved.error, 500, "internal_error");
  return getMe(request, user.userId);
}, { scopes: ["write"] });

export const POST = withApiAuth(async (request, ctx) => {
  const user = requireServiceUser(request, ctx);
  if ("error" in user) return user.error;
  if (ctx.authKind !== "arena_token") {
    return apiError(request, "Only KodloHUB game tokens can submit Brat TD scores", 403, "insufficient_scope");
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError(request, "Invalid JSON", 400, "bad_request");
  }

  const profile = await loadArenaProfile(user.userId);
  const playerName = String(body.player_name ?? body.playerName ?? "")
    .trim()
    .slice(0, 20) || (profile ? effectiveArenaNick(profile) : "Гравець");
  const score = Math.max(0, Math.floor(Number(body.score ?? 0) || 0));
  const wave = Math.max(0, Math.floor(Number(body.wave ?? 0) || 0));
  const difficulty = String(body.difficulty ?? "normal");
  const isEndless = Boolean(body.is_endless ?? body.isEndless ?? false);
  const durationSeconds =
    body.duration_seconds == null && body.durationSeconds == null
      ? null
      : Math.max(0, Math.floor(Number(body.duration_seconds ?? body.durationSeconds) || 0));
  const version = body.version == null ? null : String(body.version).slice(0, 64);
  const mapId = body.map_id == null && body.mapId == null ? null : String(body.map_id ?? body.mapId).slice(0, 64);
  const activeTitle =
    body.active_title == null && body.activeTitle == null
      ? null
      : String(body.active_title ?? body.activeTitle).slice(0, 64);
  const activeFrame =
    body.active_frame == null && body.activeFrame == null
      ? null
      : String(body.active_frame ?? body.activeFrame).slice(0, 64);

  if (!["easy", "normal", "hard", "competitive"].includes(difficulty)) {
    return apiError(request, "Invalid difficulty", 400, "bad_request");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("brat_td_scores").insert({
    user_id: user.userId,
    player_name: playerName,
    score,
    wave,
    difficulty,
    is_endless: isEndless,
    duration_seconds: durationSeconds,
    version,
    map_id: mapId,
    active_title: activeTitle,
    active_frame: activeFrame,
  });
  if (error) return apiError(request, error.message, 500, "internal_error");
  return apiJson(request, { ok: true });
}, { scopes: ["write"] });

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) ?? new Response(null, { status: 204 });
}
