import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  LEADERBOARD_LIMIT,
  TOWER_CONFIGS,
  ACHIEVEMENTS,
  getPlayerLevelForXp,
  TOWER_UNLOCK_LEVELS,
} from "@/app/(main)/tools/brat-td/gameConfig";
import { MAP_CONFIGS } from "@/lib/brat-td/maps";
import { normalizeProgression } from "@/lib/brat-td/state";

export const revalidate = 0;

type LeaderboardRow = {
  user_id: string;
  player_name: string;
  score: number;
  wave: number;
  created_at: string;
  difficulty: string;
  is_endless: boolean;
  duration_seconds: number | null;
  version: string | null;
  active_title: string | null;
  active_frame: string | null;
  map_id: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type LeaderboardKind = "best_score" | "normal_wave" | "hard_wave" | "endless_wave" | "fastest_victory";

type ProgressPayload = {
  playerLevel: number;
  totalXp: number;
  unlockedTowers: string[];
  achievements: string[];
  bonusStartGold: number;
  bonusLives: number;
  towerMastery: Record<string, { towerXp: number; unlockedTiers: string[]; highestTierAchieved: number }>;
  mapCompletions?: Record<string, string[]>;
  unlockedTitles?: string[];
  unlockedFrames?: string[];
  unlockedEffects?: string[];
  activeTitle?: string | null;
  activeFrame?: string | null;
  activeEffect?: string | null;
};

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const url = new URL(request.url);
    const leaderboardKind = (url.searchParams.get("leaderboard") ?? "best_score") as LeaderboardKind;

    let query = admin
      .from("brat_td_scores")
      .select("user_id, player_name, score, wave, created_at, difficulty, is_endless, duration_seconds, version, active_title, active_frame, map_id")
      .limit(LEADERBOARD_LIMIT);

    if (leaderboardKind === "normal_wave") {
      query = query.eq("difficulty", "normal").order("wave", { ascending: false }).order("score", { ascending: false });
    } else if (leaderboardKind === "hard_wave") {
      query = query.eq("difficulty", "hard").order("wave", { ascending: false }).order("score", { ascending: false });
    } else if (leaderboardKind === "endless_wave") {
      query = query.eq("is_endless", true).order("wave", { ascending: false }).order("score", { ascending: false });
    } else if (leaderboardKind === "fastest_victory") {
      query = query.gte("wave", 46).not("duration_seconds", "is", null).order("duration_seconds", { ascending: true }).order("score", { ascending: false });
    } else {
      query = query.order("score", { ascending: false });
    }

    const { data: topRows } = await query;

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
        ...row,
        username: p?.username ?? null,
        display_name: p?.display_name ?? null,
        avatar_url: p?.avatar_url ?? null,
      };
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let progress: ProgressPayload | null = null;
    if (user) {
      const { data: progressRow } = await admin
        .from("brat_td_progress")
        .select("player_level, total_xp, unlocked_towers, achievements, bonus_start_gold, bonus_lives, map_completions, unlocked_titles, unlocked_frames, unlocked_effects, active_title, active_frame, active_effect")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: masteryRows } = await admin
        .from("brat_td_tower_mastery")
        .select("tower_key, tower_xp, unlocked_tiers, highest_tier_achieved")
        .eq("user_id", user.id);

      if (progressRow) {
        progress = {
          playerLevel: progressRow.player_level,
          totalXp: progressRow.total_xp,
          unlockedTowers: progressRow.unlocked_towers ?? ["hammer", "boomerang"],
          achievements: progressRow.achievements ?? [],
          bonusStartGold: progressRow.bonus_start_gold ?? 0,
          bonusLives: progressRow.bonus_lives ?? 0,
          mapCompletions: progressRow.map_completions ?? {},
          unlockedTitles: progressRow.unlocked_titles ?? [],
          unlockedFrames: progressRow.unlocked_frames ?? [],
          unlockedEffects: progressRow.unlocked_effects ?? [],
          activeTitle: progressRow.active_title ?? null,
          activeFrame: progressRow.active_frame ?? null,
          activeEffect: progressRow.active_effect ?? null,
          towerMastery: Object.fromEntries((masteryRows ?? []).map((row) => [
            row.tower_key,
            {
              towerXp: Number(row.tower_xp ?? 0),
              unlockedTiers: row.unlocked_tiers ?? [],
              highestTierAchieved: row.highest_tier_achieved ?? 2,
            },
          ])),
        };
      }
    }

    return NextResponse.json({ leaderboard, progress });
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

    const body = await request.json() as { progress?: ProgressPayload };
    const rawProgress = body.progress;
    if (!rawProgress || typeof rawProgress.totalXp !== "number" || typeof rawProgress.playerLevel !== "number") {
      return NextResponse.json({ error: "Невірні дані прогресії" }, { status: 400 });
    }

    const progress = normalizeProgression(rawProgress as any, {
      towerConfigs: TOWER_CONFIGS,
      mapConfigs: MAP_CONFIGS,
      achievements: ACHIEVEMENTS,
      getPlayerLevelForXp,
      towerUnlockLevels: TOWER_UNLOCK_LEVELS,
    });

    const admin = createAdminClient();
    const { error: progressError } = await admin
      .from("brat_td_progress")
      .upsert({
        user_id: user.id,
        player_level: progress.playerLevel,
        total_xp: progress.totalXp,
        unlocked_towers: progress.unlockedTowers,
        achievements: progress.achievements,
        bonus_start_gold: progress.bonusStartGold,
        bonus_lives: progress.bonusLives,
        map_completions: progress.mapCompletions ?? {},
        unlocked_titles: progress.unlockedTitles ?? [],
        unlocked_frames: progress.unlockedFrames ?? [],
        unlocked_effects: progress.unlockedEffects ?? [],
        active_title: progress.activeTitle ?? null,
        active_frame: progress.activeFrame ?? null,
        active_effect: progress.activeEffect ?? null,
        updated_at: new Date().toISOString(),
      });

    if (progressError) {
      return NextResponse.json({ error: progressError.message }, { status: 500 });
    }

    const masteryRows = Object.entries(progress.towerMastery ?? {}).map(([towerKey, mastery]) => ({
      user_id: user.id,
      tower_key: towerKey,
      tower_xp: mastery.towerXp,
      unlocked_tiers: mastery.unlockedTiers,
      highest_tier_achieved: mastery.highestTierAchieved,
      updated_at: new Date().toISOString(),
    }));

    if (masteryRows.length > 0) {
      const { error: masteryError } = await admin
        .from("brat_td_tower_mastery")
        .upsert(masteryRows, { onConflict: "user_id,tower_key" });
      if (masteryError) {
        return NextResponse.json({ error: masteryError.message }, { status: 500 });
      }
    }

    if (progress.achievements.length > 0) {
      await admin
        .from("brat_td_achievements")
        .upsert(progress.achievements.map((achievementId) => ({ user_id: user.id, achievement_id: achievementId })), { onConflict: "user_id,achievement_id" });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Потрібно увійти, щоб зберегти результат" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { playerName, score, wave, difficulty, isEndless, durationSeconds, version, activeTitle, activeFrame, mapId } = body as {
      playerName?: string;
      score?: number;
      wave?: number;
      difficulty?: string;
      isEndless?: boolean;
      durationSeconds?: number;
      version?: string;
      activeTitle?: string | null;
      activeFrame?: string | null;
      mapId?: string;
    };

    if (typeof score !== "number" || typeof wave !== "number" || wave < 1 || wave > 1000 || score < 0) {
      return NextResponse.json({ error: "Невірні дані" }, { status: 400 });
    }

    if (!isEndless && wave > 46) {
      return NextResponse.json({ error: "Некоректна хвиля для звичайного режиму" }, { status: 400 });
    }

    // Safety checks for leaderboard submission to prevent cheating
    const maxSafeScore = 30000 + (wave > 46 ? (wave - 46) * 2000 : 0);
    const waveMaxLimit = wave <= 10 ? 1500 : wave <= 20 ? 4000 : wave <= 30 ? 10000 : maxSafeScore;
    if (score > waveMaxLimit) {
      return NextResponse.json({ error: "Недопустимий результат" }, { status: 400 });
    }

    const name = (playerName ?? "").trim() || "Анонім";

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("brat_td_scores")
      .insert({
        user_id: user.id,
        player_name: name,
        score,
        wave,
        difficulty: difficulty === "easy" || difficulty === "normal" || difficulty === "hard" ? difficulty : "normal",
        is_endless: Boolean(isEndless),
        duration_seconds: typeof durationSeconds === "number" ? Math.max(0, Math.floor(durationSeconds)) : null,
        version: version ?? null,
        active_title: activeTitle ?? null,
        active_frame: activeFrame ?? null,
        map_id: mapId ?? null,
      })
      .select("id, player_name, score, wave, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
