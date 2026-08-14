import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeLeaderboardSnapshot } from "@/lib/kava-sync";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const adminToken = process.env.KODLOHUB_API_TOKEN;

    const providedToken = authHeader?.replace(/^Bearer\s+/i, "");
    if (!adminToken) {
      return NextResponse.json(
        { error: "KODLOHUB_API_TOKEN is not configured" },
        { status: 503 }
      );
    }
    if (providedToken !== adminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      event, // 'balance_updated' | 'claim_completed' | 'transfer_completed' | 'leaderboard_sync'
      telegram_id,
      amount, // new balance
      delta, // balance change (+25, -10, etc.)
      description,
      leaderboard, // optional array of { telegram_id, amount, first_name, username, photo_url }
    } = body;

    const admin = createAdminClient();
    const now = new Date().toISOString();

    // 1. Bulk leaderboard sync
    if (event === "leaderboard_sync" && Array.isArray(leaderboard)) {
      const snapshot = normalizeLeaderboardSnapshot(leaderboard);

      // Do not erase a valid cache when the bot sends an empty/invalid snapshot.
      if (snapshot.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          linked_profiles_updated: 0,
        });
      }

      const telegramIds = snapshot.map((item) => item.telegram_id);
      const { data: linkedProfiles, error: linkedProfilesError } = await admin
        .from("profiles")
        .select("id, telegram_id")
        .in("telegram_id", telegramIds);

      if (linkedProfilesError) {
        throw linkedProfilesError;
      }

      const userIdByTelegramId = new Map(
        (linkedProfiles || [])
          .filter((profile) => profile.telegram_id)
          .map((profile) => [String(profile.telegram_id), profile.id])
      );
      const amountByTelegramId = new Map(
        snapshot.map((item) => [item.telegram_id, item.amount])
      );

      const { error: upsertError } = await admin
        .from("kava_cached_leaderboard")
        .upsert(
          snapshot.map((item) => ({
            ...item,
            user_id: userIdByTelegramId.get(item.telegram_id) || null,
            updated_at: now,
          })),
          { onConflict: "telegram_id" }
        );

      if (upsertError) {
        throw upsertError;
      }

      // Keep linked KodloHUB profiles on the same authoritative bot balance.
      const profileUpdates = await Promise.all(
        (linkedProfiles || []).map((profile) =>
          admin
            .from("profiles")
            .update({
              kava_balance_cache:
                amountByTelegramId.get(String(profile.telegram_id)) ?? 0,
            })
            .eq("id", profile.id)
        )
      );
      const failedProfileUpdate = profileUpdates.find((result) => result.error);
      if (failedProfileUpdate?.error) {
        throw failedProfileUpdate.error;
      }

      return NextResponse.json({
        success: true,
        count: snapshot.length,
        linked_profiles_updated: linkedProfiles?.length || 0,
      });
    }

    if (!telegram_id) {
      return NextResponse.json(
        { error: "telegram_id is required" },
        { status: 400 }
      );
    }

    // 2. Single balance update
    if (typeof amount === "number") {
      // Find linked profile
      const { data: profile } = await admin
        .from("profiles")
        .select("id, kava_total_claims")
        .eq("telegram_id", String(telegram_id))
        .maybeSingle();

      const profileUpdate: {
        kava_balance_cache: number;
        kava_last_claim_at?: string;
        kava_total_claims?: number;
      } = {
        kava_balance_cache: amount,
      };

      if (event === "claim_completed") {
        profileUpdate.kava_last_claim_at = now;
        if (profile) {
          profileUpdate.kava_total_claims = (profile.kava_total_claims || 0) + 1;
        }
      }

      if (profile) {
        await admin
          .from("profiles")
          .update(profileUpdate)
          .eq("id", profile.id);
      }

      // Update leaderboard cache entry
      await admin.from("kava_cached_leaderboard").upsert({
        telegram_id: String(telegram_id),
        amount,
        user_id: profile?.id || null,
        updated_at: now,
      });

      // Record in transaction log
      if (delta !== undefined) {
        await admin.from("kava_transactions_log").insert({
          telegram_id: String(telegram_id),
          user_id: profile?.id || null,
          action_type: event || "balance_updated",
          amount_change: delta,
          balance_after: amount,
          description: description || null,
          created_at: now,
        });
      }
    }

    return NextResponse.json({ success: true, timestamp: now });
  } catch (error: unknown) {
    console.error("Kava webhook error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
