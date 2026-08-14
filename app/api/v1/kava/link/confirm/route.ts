import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, telegram_id, username, first_name, photo_url, current_balance } = body;

    if (!token || !telegram_id) {
      return NextResponse.json(
        { error: "token and telegram_id are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Find link token
    const { data: linkRecord, error: findErr } = await admin
      .from("telegram_link_tokens")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .single();

    if (findErr || !linkRecord) {
      return NextResponse.json(
        { error: "Токен не знайдено або він уже використаний" },
        { status: 404 }
      );
    }

    // 2. Check expiration
    if (new Date(linkRecord.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Термін дії токена закінчився" },
        { status: 400 }
      );
    }

    // 3. Check if this telegram_id is already linked to another profile
    const { data: existingProfiles } = await admin
      .from("profiles")
      .select("id")
      .eq("telegram_id", String(telegram_id))
      .neq("id", linkRecord.user_id);

    if (existingProfiles && existingProfiles.length > 0) {
      // Unlink from previous profile if any
      await admin
        .from("profiles")
        .update({
          telegram_id: null,
          telegram_username: null,
          telegram_first_name: null,
          telegram_photo_url: null,
          telegram_linked_at: null,
        })
        .eq("telegram_id", String(telegram_id));
    }

    // 4. Update the user profile
    const now = new Date().toISOString();
    const updateData: Record<string, string | number | null> = {
      telegram_id: String(telegram_id),
      telegram_username: username || null,
      telegram_first_name: first_name || null,
      telegram_photo_url: photo_url || null,
      telegram_linked_at: now,
    };

    if (typeof current_balance === "number") {
      updateData.kava_balance_cache = current_balance;
    }

    const { error: profileUpdateErr } = await admin
      .from("profiles")
      .update(updateData)
      .eq("id", linkRecord.user_id);

    if (profileUpdateErr) {
      console.error("Profile update error:", profileUpdateErr);
      return NextResponse.json(
        { error: "Помилка оновлення профілю" },
        { status: 500 }
      );
    }

    // 5. Mark token as used
    await admin
      .from("telegram_link_tokens")
      .update({ used: true })
      .eq("id", linkRecord.id);

    // 6. Update cached leaderboard item
    if (typeof current_balance === "number") {
      await admin.from("kava_cached_leaderboard").upsert({
        telegram_id: String(telegram_id),
        amount: current_balance,
        first_name: first_name || null,
        username: username || null,
        photo_url: photo_url || null,
        user_id: linkRecord.user_id,
        updated_at: now,
      });
    }

    revalidatePath(`/profile/${linkRecord.user_id}`);

    return NextResponse.json({
      success: true,
      message: "Telegram успішно прив'язано до KodloHUB",
      user_id: linkRecord.user_id,
      telegram_id: String(telegram_id),
    });
  } catch (error: unknown) {
    console.error("Link confirm error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
