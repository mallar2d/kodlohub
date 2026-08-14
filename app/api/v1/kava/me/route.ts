import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canClaimToday, getTimeUntilNextClaim } from "@/lib/kava";
import { resolveKavaAvatar } from "@/lib/kava-profile";
import { getPodroidKavaState } from "@/lib/podroid-kava";

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
    let balance = profile.kava_balance_cache || 0;
    let lastClaim = profile.kava_last_claim_at;
    const totalClaims = profile.kava_total_claims || 0;
    let canClaim = isLinked ? canClaimToday(lastClaim) : false;
    let timeUntilNext = isLinked ? getTimeUntilNextClaim(lastClaim) : null;
    let syncStatus: "live" | "cached" | "not_linked" = isLinked
      ? "cached"
      : "not_linked";

    if (isLinked && profile.telegram_id) {
      try {
        const state = await getPodroidKavaState(String(profile.telegram_id));
        balance = state.balance;
        lastClaim = state.lastClaimAt;
        canClaim = state.canClaim;
        timeUntilNext = state.timeUntilNextClaim;
        syncStatus = "live";

        const now = new Date().toISOString();
        const [{ error: profileSyncError }, { error: leaderboardSyncError }] =
          await Promise.all([
            admin
              .from("profiles")
              .update({
                kava_balance_cache: state.balance,
                kava_last_claim_at: state.lastClaimAt,
              })
              .eq("id", profile.id),
            admin.from("kava_cached_leaderboard").upsert(
              {
                telegram_id: String(profile.telegram_id),
                amount: state.balance,
                first_name: profile.telegram_first_name || null,
                username: profile.telegram_username || null,
                photo_url: profile.telegram_photo_url || null,
                user_id: profile.id,
                updated_at: now,
              },
              { onConflict: "telegram_id" }
            ),
          ]);
        if (profileSyncError || leaderboardSyncError) {
          console.warn(
            "Kava cache reconciliation failed:",
            profileSyncError || leaderboardSyncError
          );
        }
      } catch (syncError) {
        console.warn("Live Kava state unavailable, using cache:", syncError);
      }
    }

    // Fetch recent transactions
    let recentTransactions: unknown[] = [];
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
            photoUrl: resolveKavaAvatar(
              profile.telegram_photo_url,
              profile.avatar_url
            ),
            linkedAt: profile.telegram_linked_at,
          }
        : null,
      balance,
      canClaim,
      timeUntilNextClaim: timeUntilNext,
      totalClaims,
      lastClaimAt: lastClaim,
      syncStatus,
      transactions: recentTransactions,
    });
  } catch (error: unknown) {
    console.error("Kava me error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
