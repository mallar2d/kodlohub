import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  claimPodroidKava,
  PodroidKavaIntegrationError,
} from "@/lib/podroid-kava";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select(
        "id, telegram_id, telegram_username, telegram_first_name, telegram_photo_url"
      )
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Профіль не знайдено" }, { status: 404 });
    }

    if (!profile.telegram_id) {
      return NextResponse.json(
        { error: "Спочатку підключи Telegram акаунт" },
        { status: 400 }
      );
    }

    // The bot owns the balance and the 22:00 claim window. The website must not
    // calculate or write an independent award because the services use separate DBs.
    const result = await claimPodroidKava(String(profile.telegram_id));

    if (typeof result.newBalance === "number") {
      const profileUpdate: Record<string, string | number> = {
        kava_balance_cache: result.newBalance,
      };
      if (result.lastClaimAt) {
        profileUpdate.kava_last_claim_at = result.lastClaimAt;
      }
      const { error: updateError } = await admin
        .from("profiles")
        .update(profileUpdate)
        .eq("id", profile.id);
      if (updateError) throw updateError;

      const { error: leaderboardError } = await admin
        .from("kava_cached_leaderboard")
        .upsert(
          {
            telegram_id: String(profile.telegram_id),
            amount: result.newBalance,
            first_name: profile.telegram_first_name || null,
            username: profile.telegram_username || null,
            photo_url: profile.telegram_photo_url || null,
            user_id: profile.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "telegram_id" }
        );
      if (leaderboardError) throw leaderboardError;
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, newBalance: result.newBalance },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Claim error:", error);
    const message =
      error instanceof Error ? error.message : "Помилка клейму кави";
    return NextResponse.json(
      { error: message },
      { status: error instanceof PodroidKavaIntegrationError ? 503 : 500 }
    );
  }
}
