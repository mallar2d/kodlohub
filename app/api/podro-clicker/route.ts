import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { normalizeState, type ClickerState } from "@/lib/podro-clicker/state";
import { HELPERS } from "@/lib/podro-clicker/gameConfig";

export const revalidate = 0;

const LEADERBOARD_LIMIT = 20;

type LeaderboardRow = {
  user_id: string;
  career_grams: number;
  respect_points: number;
  prestige_count: number;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

// Захист від абсурдних значень при синхронізації клієнтського офлайн/онлайн прогресу.
// Це казуальна фіча (не турнірний рейтинг), тож кепи щедрі — головне відсікти явний фрод.
const MAX_PLAUSIBLE_GRAMS = 1e15;
const MAX_PLAUSIBLE_CLICKS = 50_000_000;
const MAX_HELPER_OWNED = 1_000_000;

function sanitizeIncomingState(raw: unknown): ClickerState {
  const state = normalizeState(raw);
  return {
    ...state,
    grams: Math.min(state.grams, MAX_PLAUSIBLE_GRAMS),
    careerGrams: Math.min(state.careerGrams, MAX_PLAUSIBLE_GRAMS),
    totalClicks: Math.min(state.totalClicks, MAX_PLAUSIBLE_CLICKS),
    helpers: Object.fromEntries(
      HELPERS.map((h) => [h.id, Math.min(state.helpers[h.id] ?? 0, MAX_HELPER_OWNED)]).filter(
        ([, count]) => (count as number) > 0,
      ),
    ),
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();

    const { data: topRows } = await admin
      .from("podro_clicker_leaderboard")
      .select("user_id, career_grams, respect_points, prestige_count")
      .limit(LEADERBOARD_LIMIT);

    const topIds = [...new Set((topRows ?? []).map((r) => r.user_id))];
    const profilesById = new Map<
      string,
      { username: string; display_name: string | null; avatar_url: string | null }
    >();
    if (topIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", topIds);
      for (const p of profiles ?? []) {
        profilesById.set(p.id, p);
      }
    }

    const leaderboard: LeaderboardRow[] = (topRows ?? []).map((row) => {
      const p = profilesById.get(row.user_id);
      return {
        user_id: row.user_id,
        career_grams: Number(row.career_grams ?? 0),
        respect_points: Number(row.respect_points ?? 0),
        prestige_count: row.prestige_count ?? 0,
        username: p?.username ?? null,
        display_name: p?.display_name ?? null,
        avatar_url: p?.avatar_url ?? null,
      };
    });

    let progress: (ClickerState & { userId: string }) | null = null;
    if (user) {
      const { data: row } = await admin
        .from("podro_clicker_progress")
        .select("grams, career_grams, total_clicks, helpers, upgrades, achievements, respect_points, prestige_count, last_tick_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (row) {
        progress = {
          userId: user.id,
          grams: Number(row.grams ?? 0),
          careerGrams: Number(row.career_grams ?? 0),
          totalClicks: Number(row.total_clicks ?? 0),
          helpers: row.helpers ?? {},
          upgrades: row.upgrades ?? [],
          achievements: row.achievements ?? [],
          respectPoints: Number(row.respect_points ?? 0),
          prestigeCount: row.prestige_count ?? 0,
          lastTickAt: row.last_tick_at ? new Date(row.last_tick_at).getTime() : Date.now(),
        };
      }
    }

    return NextResponse.json({ leaderboard, progress, isAuthed: !!user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Потрібно увійти, щоб зберегти прогрес" }, { status: 401 });
    }

    const body = await request.json();
    const state = sanitizeIncomingState(body?.state);

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("podro_clicker_progress")
      .select("career_grams, respect_points, prestige_count, total_clicks, last_tick_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      const dbCareer = Number(existing.career_grams ?? 0);
      const dbRespect = Number(existing.respect_points ?? 0);
      const dbPrestige = Number(existing.prestige_count ?? 0);
      const dbClicks = Number(existing.total_clicks ?? 0);

      if (state.careerGrams < dbCareer) {
        return NextResponse.json(
          { error: "Неможливо зменшити career-прогрес" },
          { status: 400 },
        );
      }
      if (state.respectPoints < dbRespect || state.prestigeCount < dbPrestige) {
        return NextResponse.json({ error: "Неможливо зменшити престиж" }, { status: 400 });
      }
      if (state.totalClicks < dbClicks) {
        return NextResponse.json({ error: "Неможливо зменшити лічильник кліків" }, { status: 400 });
      }

      const lastTick = existing.last_tick_at ? new Date(existing.last_tick_at).getTime() : Date.now();
      const elapsedSec = Math.max(0, (Date.now() - lastTick) / 1000);
      const maxGain = elapsedSec * 50_000 + 5_000;
      if (state.careerGrams > dbCareer + maxGain) {
        return NextResponse.json({ error: "Недопустимий приріст прогресу" }, { status: 400 });
      }
    }

    const { error } = await admin.from("podro_clicker_progress").upsert({
      user_id: user.id,
      grams: state.grams,
      career_grams: state.careerGrams,
      total_clicks: state.totalClicks,
      helpers: state.helpers,
      upgrades: state.upgrades,
      achievements: state.achievements,
      respect_points: state.respectPoints,
      prestige_count: state.prestigeCount,
      last_tick_at: new Date(state.lastTickAt).toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
