import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const revalidate = 0;

const LEADERBOARD_LIMIT = 10;

type LeaderboardRow = {
  user_id: string;
  player_name: string;
  score: number;
  wave: number;
  created_at: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type ProgressPayload = {
  playerLevel: number;
  totalXp: number;
  unlockedTowers: string[];
  achievements: string[];
  bonusStartGold: number;
  bonusLives: number;
  towerMastery: Record<string, { towerXp: number; unlockedTiers: string[]; highestTierAchieved: number }>;
  mapCompletions?: Record<string, string[]>;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: topRows } = await admin
      .from("brat_td_scores")
      .select("user_id, player_name, score, wave, created_at")
      .order("score", { ascending: false })
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
        .select("player_level, total_xp, unlocked_towers, achievements, bonus_start_gold, bonus_lives, map_completions")
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
    const progress = body.progress;
    if (!progress || typeof progress.totalXp !== "number" || typeof progress.playerLevel !== "number") {
      return NextResponse.json({ error: "Невірні дані прогресії" }, { status: 400 });
    }

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
    const { playerName, score, wave } = body as {
      playerName?: string;
      score?: number;
      wave?: number;
    };

    if (typeof score !== "number" || typeof wave !== "number") {
      return NextResponse.json({ error: "Невірні дані" }, { status: 400 });
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
