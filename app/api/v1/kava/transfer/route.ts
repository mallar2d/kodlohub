import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PodroidKavaIntegrationError,
  transferPodroidKava,
} from "@/lib/podroid-kava";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
    }

    const body = await req.json();
    const transferAmount = Number(body?.amount);
    const rawRecipient = String(body?.recipient || "").trim();

    if (!Number.isInteger(transferAmount) || transferAmount <= 0) {
      return NextResponse.json(
        { error: "Сума має бути цілим числом більше 0" },
        { status: 400 }
      );
    }
    if (!rawRecipient) {
      return NextResponse.json(
        { error: "Вкажи отримувача (@username, telegram_id або ID у KodloHUB)" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: sender, error: senderError } = await admin
      .from("profiles")
      .select("id, telegram_id")
      .eq("id", user.id)
      .single();

    if (senderError || !sender) {
      return NextResponse.json({ error: "Профіль не знайдено" }, { status: 404 });
    }
    if (!sender.telegram_id) {
      return NextResponse.json(
        { error: "Спочатку підключи Telegram акаунт" },
        { status: 400 }
      );
    }

    // A KodloHUB profile UUID is translated to Telegram ID. Usernames and
    // Telegram IDs are resolved by the authoritative bot database itself.
    let botRecipient = rawRecipient;
    if (UUID_PATTERN.test(rawRecipient)) {
      const { data: recipientProfile } = await admin
        .from("profiles")
        .select("telegram_id")
        .eq("id", rawRecipient)
        .maybeSingle();
      if (!recipientProfile?.telegram_id) {
        return NextResponse.json(
          { error: "У цього користувача не підключено Telegram" },
          { status: 404 }
        );
      }
      botRecipient = String(recipientProfile.telegram_id);
    }

    const result = await transferPodroidKava({
      senderTelegramId: String(sender.telegram_id),
      recipient: botRecipient,
      amount: transferAmount,
    });

    const now = new Date().toISOString();
    if (typeof result.newBalance === "number") {
      const { error: senderUpdateError } = await admin
        .from("profiles")
        .update({ kava_balance_cache: result.newBalance })
        .eq("id", sender.id);
      if (senderUpdateError) throw senderUpdateError;

      const { error: senderCacheError } = await admin
        .from("kava_cached_leaderboard")
        .upsert(
          {
            telegram_id: String(sender.telegram_id),
            amount: result.newBalance,
            user_id: sender.id,
            updated_at: now,
          },
          { onConflict: "telegram_id" }
        );
      if (senderCacheError) throw senderCacheError;
    }

    if (
      result.success &&
      result.recipientTelegramId &&
      typeof result.recipientNewBalance === "number"
    ) {
      const { data: recipientProfile, error: recipientLookupError } = await admin
        .from("profiles")
        .select("id")
        .eq("telegram_id", result.recipientTelegramId)
        .maybeSingle();
      if (recipientLookupError) throw recipientLookupError;

      if (recipientProfile) {
        const { error: recipientUpdateError } = await admin
          .from("profiles")
          .update({ kava_balance_cache: result.recipientNewBalance })
          .eq("id", recipientProfile.id);
        if (recipientUpdateError) throw recipientUpdateError;
      }

      const { error: recipientCacheError } = await admin
        .from("kava_cached_leaderboard")
        .upsert(
          {
            telegram_id: result.recipientTelegramId,
            amount: result.recipientNewBalance,
            user_id: recipientProfile?.id || null,
            updated_at: now,
          },
          { onConflict: "telegram_id" }
        );
      if (recipientCacheError) throw recipientCacheError;
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, newBalance: result.newBalance },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Transfer error:", error);
    const message = error instanceof Error ? error.message : "Помилка переказу";
    return NextResponse.json(
      { error: message },
      { status: error instanceof PodroidKavaIntegrationError ? 503 : 500 }
    );
  }
}
