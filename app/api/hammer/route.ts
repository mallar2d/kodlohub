import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const revalidate = 0;

const COOLDOWN_MS = 60 * 60 * 1000;
const LEADERBOARD_LIMIT = 10;

type LeaderboardRow = {
  user_id: string;
  count: number;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();

    const { count: totalHits } = await admin
      .from("hammer_hits")
      .select("id", { count: "exact", head: true });

    const { count: totalHitters } = await admin
      .from("hammer_hits")
      .select("user_id", { count: "exact", head: true })
      .not("user_id", "is", null);

    const { data: agg } = await admin
      .from("hammer_hits")
      .select("user_id")
      .not("user_id", "is", null);

    const counts = new Map<string, number>();
    for (const row of agg ?? []) {
      if (!row.user_id) continue;
      counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
    }

    const topIds = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, LEADERBOARD_LIMIT)
      .map(([id]) => id);

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

    const leaderboard: LeaderboardRow[] = topIds.map((id) => {
      const p = profilesById.get(id);
      return {
        user_id: id,
        count: counts.get(id) ?? 0,
        username: p?.username ?? null,
        display_name: p?.display_name ?? null,
        avatar_url: p?.avatar_url ?? null,
      };
    });

    let myCount = 0;
    let myLastHit: string | null = null;
    let myRank: number | null = null;
    if (user) {
      myCount = counts.get(user.id) ?? 0;

      const { data: last } = await admin
        .from("hammer_hits")
        .select("hit_at")
        .eq("user_id", user.id)
        .order("hit_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      myLastHit = last?.hit_at ?? null;

      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      const idx = sorted.findIndex(([id]) => id === user.id);
      if (idx >= 0) myRank = idx + 1;
    }

    return NextResponse.json({
      totalHits: totalHits ?? 0,
      totalHitters: totalHitters ?? 0,
      leaderboard,
      me: user
        ? {
            userId: user.id,
            count: myCount,
            lastHitAt: myLastHit,
            rank: myRank,
            cooldownMs: COOLDOWN_MS,
          }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Потрібно увійти, щоб йобнути молотком" },
        { status: 401 },
      );
    }

    const admin = createAdminClient();

    const { data: last } = await admin
      .from("hammer_hits")
      .select("hit_at")
      .eq("user_id", user.id)
      .order("hit_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = Date.now();
    if (last?.hit_at) {
      const lastMs = new Date(last.hit_at).getTime();
      const elapsed = now - lastMs;
      if (elapsed < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - elapsed;
        return NextResponse.json(
          {
            error: "Кулдаун. Зачекай трохи, кодило.",
            remainingMs,
          },
          { status: 429 },
        );
      }
    }

    const { error: insertErr } = await admin.from("hammer_hits").insert({
      user_id: user.id,
      hit_at: new Date(now).toISOString(),
    });

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, hitAt: new Date(now).toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
