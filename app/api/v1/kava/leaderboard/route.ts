import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();

    // Query leaderboard
    const { data: rows, error } = await admin
      .from("kava_cached_leaderboard")
      .select("telegram_id, amount, first_name, username, photo_url, user_id, updated_at")
      .order("amount", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Leaderboard query error:", error);
      return NextResponse.json(
        { error: "Помилка завантаження лідерборду" },
        { status: 500 }
      );
    }

    // Also fetch linked KodloHUB users for avatars/display names if present
    const userIds = (rows || []).map((r) => r.user_id).filter(Boolean);
    let profileMap = new Map<string, any>();

    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .in("id", userIds);

      (profiles || []).forEach((p) => profileMap.set(p.id, p));
    }

    const leaderboard = (rows || []).map((row, index) => {
      const profile = row.user_id ? profileMap.get(row.user_id) : null;
      return {
        rank: index + 1,
        telegram_id: row.telegram_id,
        amount: row.amount,
        first_name: row.first_name,
        username: row.username,
        photo_url: row.photo_url || profile?.avatar_url || null,
        kodlohub_user: profile
          ? {
              id: profile.id,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
              role: profile.role,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      count: leaderboard.length,
      leaderboard,
    });
  } catch (error: any) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
