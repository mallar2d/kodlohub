import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const revalidate = 0;

const COOLDOWN_MS = 60 * 60 * 1000;
const LEADERBOARD_LIMIT = 10;
const SPECIAL_HOUR = 22;
const SPECIAL_MULTIPLIER = 22;

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

    const [{ data: totalData }, { data: uniqueHitters }, { data: topRows }] =
      await Promise.all([
        admin
          .from("hammer_hits")
          .select("multiplier", { count: "exact" }),

        admin.rpc("hammer_unique_hitters"),

        admin
          .from("hammer_leaderboard")
          .select("user_id, count")
          .limit(LEADERBOARD_LIMIT),
      ]);

    const totalHits = (totalData ?? []).reduce(
      (sum: number, row: { multiplier: number }) => sum + (row.multiplier ?? 1),
      0,
    );

    const topIds = (topRows ?? []).map(
      (r: { user_id: string }) => r.user_id,
    );

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

    const leaderboard: LeaderboardRow[] = (topRows ?? []).map(
      (row: { user_id: string; count: number }) => {
        const p = profilesById.get(row.user_id);
        return {
          user_id: row.user_id,
          count: row.count,
          username: p?.username ?? null,
          display_name: p?.display_name ?? null,
          avatar_url: p?.avatar_url ?? null,
        };
      },
    );

    let myCount = 0;
    let myLastHit: string | null = null;
    let myRank: number | null = null;

    if (user) {
      const [{ data: myHitsData }, { data: lastHit }, { data: rankVal }] =
        await Promise.all([
          admin
            .from("hammer_hits")
            .select("multiplier")
            .eq("user_id", user.id),

          admin
            .from("hammer_hits")
            .select("hit_at")
            .eq("user_id", user.id)
            .order("hit_at", { ascending: false })
            .limit(1)
            .maybeSingle(),

          admin.rpc("hammer_user_rank", { p_user_id: user.id }),
        ]);

      myCount = (myHitsData ?? []).reduce(
        (sum: number, row: { multiplier: number }) => sum + (row.multiplier ?? 1),
        0,
      );
      myLastHit = lastHit?.hit_at ?? null;
      myRank = rankVal ?? null;
    }

    return NextResponse.json({
      totalHits: totalHits ?? 0,
      totalHitters: uniqueHitters ?? 0,
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

    const now = new Date();
    const serverHour = now.getHours();
    const serverMinute = now.getMinutes();
    const isSpecialHour = serverHour === SPECIAL_HOUR && serverMinute === 0;
    const multiplier = isSpecialHour ? SPECIAL_MULTIPLIER : 1;

    const { data, error } = await admin.rpc("hammer_hit", {
      p_user_id: user.id,
      p_multiplier: multiplier,
    });

    if (error) {
      if (error.message?.includes("cooldown") || error.code === "P0001") {
        const { data: last } = await admin
          .from("hammer_hits")
          .select("hit_at")
          .eq("user_id", user.id)
          .order("hit_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const remainingMs = last?.hit_at
          ? COOLDOWN_MS - (Date.now() - new Date(last.hit_at).getTime())
          : COOLDOWN_MS;

        return NextResponse.json(
          {
            error: "Кулдаун. Зачекай трохи, кодило.",
            remainingMs: Math.max(remainingMs, 0),
          },
          { status: 429 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const hitResult = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      success: true,
      hitAt: hitResult?.hit_at ?? hitResult,
      multiplier: hitResult?.multiplier ?? multiplier,
      isSpecial: isSpecialHour,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
