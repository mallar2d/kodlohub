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

export async function GET() {
  try {
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

    return NextResponse.json({ leaderboard });
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
