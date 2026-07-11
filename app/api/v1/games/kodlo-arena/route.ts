import { withApiAuth, requireServiceUser } from "@/lib/api/auth";
import { apiError, apiJson } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  effectiveArenaNick,
  loadArenaProfile,
  loadOrCreateArenaStats,
  validateMatchPayload,
} from "@/lib/arena/auth";
import { handleCorsPreflight } from "@/lib/api/cors";

const LEADERBOARD_LIMIT = 20;

async function getMe(request: Request, userId: string) {
  const profile = await loadArenaProfile(userId);
  if (!profile) return apiError(request, "Profile not found", 404, "not_found");
  const stats = await loadOrCreateArenaStats(userId);
  return apiJson(request, {
    user_id: profile.id,
    username: profile.username,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    game_nick: profile.game_nick,
    effective_nick: effectiveArenaNick(profile),
    stats: {
      frags: stats?.frags ?? 0,
      deaths: stats?.deaths ?? 0,
      matches: stats?.matches ?? 0,
      wins: stats?.wins ?? 0,
      playtime_seconds: stats?.playtime_seconds ?? 0,
      favorite_map: stats?.favorite_map ?? null,
      updated_at: stats?.updated_at ?? null,
    },
  });
}

export const GET = withApiAuth(async (request, ctx) => {
  const url = new URL(request.url);
  const view = url.searchParams.get("view") || "me";

  if (view === "leaderboard") {
    const admin = createAdminClient();
    const sort = url.searchParams.get("sort") === "wins" ? "wins" : "frags";
    const { data: rows } = await admin
      .from("kodlo_arena_stats")
      .select("user_id, frags, deaths, matches, wins, playtime_seconds, favorite_map")
      .order(sort, { ascending: false })
      .limit(LEADERBOARD_LIMIT);

    const ids = (rows ?? []).map((r) => r.user_id);
    const profilesById = new Map<string, Awaited<ReturnType<typeof loadArenaProfile>>>();
    if (ids.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, username, display_name, avatar_url, game_nick")
        .in("id", ids);
      for (const p of profiles ?? []) profilesById.set(p.id, p as never);
    }

    const leaderboard = (rows ?? []).map((row, index) => {
      const p = profilesById.get(row.user_id);
      return {
        rank: index + 1,
        user_id: row.user_id,
        frags: row.frags,
        deaths: row.deaths,
        matches: row.matches,
        wins: row.wins,
        playtime_seconds: row.playtime_seconds,
        favorite_map: row.favorite_map,
        username: p?.username ?? null,
        display_name: p?.display_name ?? null,
        avatar_url: p?.avatar_url ?? null,
        game_nick: p?.game_nick ?? null,
        effective_nick: p ? effectiveArenaNick(p) : "Гравець",
      };
    });

    return apiJson(request, { leaderboard, sort });
  }

  const user = requireServiceUser(request, ctx);
  if ("error" in user) return user.error;
  return getMe(request, user.userId);
}, { scopes: ["read"] });

export const PATCH = withApiAuth(async (request, ctx) => {
  const user = requireServiceUser(request, ctx);
  if ("error" in user) return user.error;
  if (ctx.authKind !== "arena_token") {
    return apiError(request, "Only arena tokens can update game_nick", 403, "insufficient_scope");
  }

  let body: { game_nick?: string | null };
  try {
    body = await request.json();
  } catch {
    return apiError(request, "Invalid JSON", 400, "bad_request");
  }

  let gameNick: string | null = body.game_nick == null ? null : String(body.game_nick).trim();
  if (gameNick === "") gameNick = null;
  if (gameNick != null) {
    gameNick = gameNick.slice(0, 24);
    if (!/^[\p{L}\p{N}_\- .]{2,24}$/u.test(gameNick)) {
      return apiError(request, "Invalid game_nick", 400, "bad_request");
    }
  }

  const admin = createAdminClient();
  if (gameNick) {
    const { data: taken } = await admin
      .from("profiles")
      .select("id")
      .ilike("game_nick", gameNick)
      .neq("id", user.userId)
      .maybeSingle();
    if (taken) {
      return apiError(request, "game_nick already taken", 409, "conflict");
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({ game_nick: gameNick })
    .eq("id", user.userId);
  if (error) return apiError(request, error.message, 500, "internal_error");
  return getMe(request, user.userId);
}, { scopes: ["write"] });

export const POST = withApiAuth(async (request, ctx) => {
  const user = requireServiceUser(request, ctx);
  if ("error" in user) return user.error;
  if (ctx.authKind !== "arena_token") {
    return apiError(request, "Only arena tokens can submit matches", 403, "insufficient_scope");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(request, "Invalid JSON", 400, "bad_request");
  }

  const validated = validateMatchPayload(body);
  if (!validated.ok) return apiError(request, validated.error, 400, "bad_request");
  const match = validated.data;
  const admin = createAdminClient();

  const { error: insertErr } = await admin.from("kodlo_arena_matches").insert({
    user_id: user.userId,
    map_id: match.map_id,
    mode_id: match.mode_id,
    frags: match.frags,
    deaths: match.deaths,
    duration_seconds: match.duration_seconds,
    result: match.result,
    client_version: match.client_version,
  });
  if (insertErr) return apiError(request, insertErr.message, 500, "internal_error");

  const stats = await loadOrCreateArenaStats(user.userId);
  const next = {
    frags: (stats?.frags ?? 0) + match.frags,
    deaths: (stats?.deaths ?? 0) + match.deaths,
    matches: (stats?.matches ?? 0) + 1,
    wins: (stats?.wins ?? 0) + (match.result === "win" ? 1 : 0),
    playtime_seconds: (stats?.playtime_seconds ?? 0) + match.duration_seconds,
    favorite_map: match.map_id,
    updated_at: new Date().toISOString(),
  };
  await admin.from("kodlo_arena_stats").upsert({ user_id: user.userId, ...next }, { onConflict: "user_id" });

  return apiJson(request, { ok: true, stats: next });
}, { scopes: ["write"] });

export async function OPTIONS(request: Request) {
  const preflight = handleCorsPreflight(request);
  return preflight ?? new Response(null, { status: 204 });
}
