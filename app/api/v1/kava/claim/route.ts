import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canClaimToday, getKyivNow } from "@/lib/kava";

function randomRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

    // Fetch user profile
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, telegram_id, telegram_username, telegram_first_name, telegram_photo_url, kava_balance_cache, kava_last_claim_at, kava_total_claims")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Профіль не знайдено" }, { status: 404 });
    }

    if (!profile.telegram_id) {
      return NextResponse.json(
        { error: "Спочатку підключи Telegram акаунт" },
        { status: 400 }
      );
    }

    // Check if can claim today
    const canClaim = canClaimToday(profile.kava_last_claim_at);
    if (!canClaim) {
      return NextResponse.json(
        { error: "Ти вже йобнув каву сьогодні. Спробуй після 22:00 за Коростишевом" },
        { status: 400 }
      );
    }

    const kyiv = getKyivNow();
    const now = new Date().toISOString();

    const isBonus = kyiv.hour === 22 && kyiv.minute === 0;
    const baseAward = isBonus ? randomRange(-10, 25) : randomRange(-20, 30);
    const bonusAmount = isBonus ? 22 : 0;
    let award = baseAward + bonusAmount;

    const currentBalance = profile.kava_balance_cache || 0;
    if (currentBalance + award < 0) {
      award = -currentBalance;
    }

    const newBalance = currentBalance + award;
    const newTotalClaims = (profile.kava_total_claims || 0) + 1;

    // 1. Update KodloHUB profile
    await admin
      .from("profiles")
      .update({
        kava_balance_cache: newBalance,
        kava_last_claim_at: now,
        kava_total_claims: newTotalClaims,
      })
      .eq("id", user.id);

    // 2. Log transaction
    await admin.from("kava_transactions_log").insert({
      telegram_id: profile.telegram_id,
      user_id: user.id,
      action_type: isBonus ? "claim_bonus" : "claim",
      amount_change: award,
      balance_after: newBalance,
      description: isBonus ? "Daily claim with 22:00 bonus (+22)" : "Daily claim",
      created_at: now,
    });

    // 3. Update leaderboard cache
    await admin.from("kava_cached_leaderboard").upsert({
      telegram_id: profile.telegram_id,
      amount: newBalance,
      first_name: profile.telegram_first_name || null,
      username: profile.telegram_username || null,
      photo_url: profile.telegram_photo_url || null,
      user_id: user.id,
      updated_at: now,
    });

    // 4. Sync outward to .podroid-kava if endpoint configured
    const podroidApiUrl = process.env.PODROID_KAVA_API_URL;
    const podroidApiToken = process.env.KODLOHUB_API_TOKEN;
    if (podroidApiUrl && podroidApiToken) {
      fetch(`${podroidApiUrl}/clicker/api/external-claim-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${podroidApiToken}`,
        },
        body: JSON.stringify({
          telegram_id: profile.telegram_id,
          award,
          new_balance: newBalance,
          is_bonus: isBonus,
          timestamp: now,
        }),
      }).catch((e) => console.error("Outward sync to podroid failed:", e));
    }

    return NextResponse.json({
      success: true,
      amount: award,
      baseAward,
      bonus: isBonus,
      bonusAmount,
      newBalance,
      message: isBonus
        ? `${award > 0 ? `+${award}` : award} kava (+22 йобнув бонус)`
        : `${award > 0 ? `+${award}` : award} kava`,
    });
  } catch (error: any) {
    console.error("Claim error:", error);
    return NextResponse.json(
      { error: error?.message || "Помилка клейму кави" },
      { status: 500 }
    );
  }
}
