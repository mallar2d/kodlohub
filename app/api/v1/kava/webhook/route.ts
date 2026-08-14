import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const adminToken = process.env.KODLOHUB_API_TOKEN;

    const providedToken = authHeader?.replace(/^Bearer\s+/i, "");
    if (adminToken && providedToken && providedToken !== adminToken) {
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
      for (const item of leaderboard) {
        if (!item.telegram_id) continue;
        await admin.from("kava_cached_leaderboard").upsert({
          telegram_id: String(item.telegram_id),
          amount: Number(item.amount || 0),
          first_name: item.first_name || null,
          username: item.username || null,
          photo_url: item.photo_url || null,
          updated_at: now,
        });
      }
      return NextResponse.json({ success: true, count: leaderboard.length });
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

      const profileUpdate: Record<string, any> = {
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
  } catch (error: any) {
    console.error("Kava webhook error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
