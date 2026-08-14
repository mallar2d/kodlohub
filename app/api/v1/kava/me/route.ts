import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canClaimToday, getTimeUntilNextClaim } from "@/lib/kava";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Fetch user profile
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select(
        "id, display_name, avatar_url, telegram_id, telegram_username, telegram_first_name, telegram_photo_url, telegram_linked_at, kava_balance_cache, kava_last_claim_at, kava_total_claims"
      )
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json(
        { error: "Профіль не знайдено" },
        { status: 404 }
      );
    }

    const isLinked = Boolean(profile.telegram_id);
    const lastClaim = profile.kava_last_claim_at;
    const canClaim = isLinked ? canClaimToday(lastClaim) : false;
    const timeUntilNext = isLinked ? getTimeUntilNextClaim(lastClaim) : null;

    // Fetch recent transactions
    let recentTransactions: any[] = [];
    if (isLinked) {
      const { data: txs } = await admin
        .from("kava_transactions_log")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      recentTransactions = txs || [];
    }

    return NextResponse.json({
      success: true,
      isLinked,
      telegram: isLinked
        ? {
            id: profile.telegram_id,
            username: profile.telegram_username,
            firstName: profile.telegram_first_name,
            photoUrl: profile.telegram_photo_url,
            linkedAt: profile.telegram_linked_at,
          }
        : null,
      balance: profile.kava_balance_cache || 0,
      canClaim,
      timeUntilNextClaim: timeUntilNext,
      totalClaims: profile.kava_total_claims || 0,
      lastClaimAt: lastClaim,
      transactions: recentTransactions,
    });
  } catch (error: any) {
    console.error("Kava me error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
