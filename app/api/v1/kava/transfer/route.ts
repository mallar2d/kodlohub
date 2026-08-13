import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const { recipient, amount } = body;

    const transferAmount = Number(amount);
    if (!Number.isInteger(transferAmount) || transferAmount <= 0) {
      return NextResponse.json(
        { error: "Сума має бути цілим числом більше 0" },
        { status: 400 }
      );
    }

    const rawRecipient = String(recipient || "").trim();
    if (!rawRecipient) {
      return NextResponse.json(
        { error: "Вкажи отримувача (@username, telegram_id або ID у KodloHUB)" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Fetch sender profile
    const { data: sender, error: senderErr } = await admin
      .from("profiles")
      .select("id, telegram_id, telegram_username, telegram_first_name, kava_balance_cache")
      .eq("id", user.id)
      .single();

    if (senderErr || !sender) {
      return NextResponse.json({ error: "Профіль не знайдено" }, { status: 404 });
    }

    if (!sender.telegram_id) {
      return NextResponse.json(
        { error: "Спочатку підключи Telegram акаунт" },
        { status: 400 }
      );
    }

    const cleanRecipient = rawRecipient.replace(/^@/, "");

    // 2. Find recipient in profiles or cached leaderboard
    let recipientProfile: any = null;

    // Try finding by telegram_username, telegram_id, or profile id
    const { data: byProfile } = await admin
      .from("profiles")
      .select("id, telegram_id, telegram_username, telegram_first_name, full_name, kava_balance_cache")
      .or(`telegram_username.ilike.${cleanRecipient},telegram_id.eq.${cleanRecipient},id.eq.${cleanRecipient}`)
      .maybeSingle();

    if (byProfile) {
      recipientProfile = byProfile;
    } else {
      // Look in cached leaderboard by username or telegram_id
      const { data: byLeaderboard } = await admin
        .from("kava_cached_leaderboard")
        .select("telegram_id, amount, first_name, username, user_id")
        .or(`username.ilike.${cleanRecipient},telegram_id.eq.${cleanRecipient}`)
        .maybeSingle();

      if (byLeaderboard) {
        recipientProfile = {
          id: byLeaderboard.user_id,
          telegram_id: byLeaderboard.telegram_id,
          telegram_username: byLeaderboard.username,
          telegram_first_name: byLeaderboard.first_name,
          kava_balance_cache: byLeaderboard.amount,
        };
      }
    }

    if (!recipientProfile || !recipientProfile.telegram_id) {
      return NextResponse.json(
        { error: "Отримувача не знайдено (користувач повинен бути в боті або на сайті)" },
        { status: 404 }
      );
    }

    // 3. Self-transfer check with classic penalty
    if (recipientProfile.telegram_id === sender.telegram_id || recipientProfile.id === sender.id) {
      const penaltyBalance = Math.max(0, (sender.kava_balance_cache || 0) - 1);
      await admin
        .from("profiles")
        .update({ kava_balance_cache: penaltyBalance })
        .eq("id", user.id);

      await admin.from("kava_transactions_log").insert({
        telegram_id: sender.telegram_id,
        user_id: sender.id,
        action_type: "penalty",
        amount_change: -1,
        balance_after: penaltyBalance,
        description: "Штраф за спробу переказу самому собі",
        created_at: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          error: "Переказ самому собі неможливий (-1 ☕ штрафу)",
          newBalance: penaltyBalance,
        },
        { status: 400 }
      );
    }

    // 4. Balance check
    const senderBalance = sender.kava_balance_cache || 0;
    if (senderBalance < transferAmount) {
      return NextResponse.json(
        { error: `Недостатньо кави (у тебе ${senderBalance} ☕, потрібно ${transferAmount} ☕)` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newSenderBalance = senderBalance - transferAmount;
    const recipientBalance = recipientProfile.kava_balance_cache || 0;
    const newRecipientBalance = recipientBalance + transferAmount;

    // 5. Deduct sender
    await admin
      .from("profiles")
      .update({ kava_balance_cache: newSenderBalance })
      .eq("id", sender.id);

    await admin.from("kava_transactions_log").insert({
      telegram_id: sender.telegram_id,
      user_id: sender.id,
      action_type: "transfer_sent",
      amount_change: -transferAmount,
      balance_after: newSenderBalance,
      description: `Переказ ${transferAmount} ☕ для @${recipientProfile.telegram_username || recipientProfile.telegram_id}`,
      created_at: now,
    });

    // 6. Credit recipient
    if (recipientProfile.id) {
      await admin
        .from("profiles")
        .update({ kava_balance_cache: newRecipientBalance })
        .eq("id", recipientProfile.id);
    }

    await admin.from("kava_cached_leaderboard").upsert({
      telegram_id: recipientProfile.telegram_id,
      amount: newRecipientBalance,
      first_name: recipientProfile.telegram_first_name || null,
      username: recipientProfile.telegram_username || null,
      user_id: recipientProfile.id || null,
      updated_at: now,
    });

    await admin.from("kava_transactions_log").insert({
      telegram_id: recipientProfile.telegram_id,
      user_id: recipientProfile.id || null,
      action_type: "transfer_received",
      amount_change: transferAmount,
      balance_after: newRecipientBalance,
      description: `Отримано ${transferAmount} ☕ від @${sender.telegram_username || sender.telegram_id}`,
      created_at: now,
    });

    // 7. Outward sync to .podroid-kava
    const podroidApiUrl = process.env.PODROID_KAVA_API_URL;
    const podroidApiToken = process.env.KODLOHUB_API_TOKEN;
    if (podroidApiUrl && podroidApiToken) {
      fetch(`${podroidApiUrl}/clicker/api/external-transfer-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${podroidApiToken}`,
        },
        body: JSON.stringify({
          sender_telegram_id: sender.telegram_id,
          recipient_telegram_id: recipientProfile.telegram_id,
          amount: transferAmount,
          sender_new_balance: newSenderBalance,
          recipient_new_balance: newRecipientBalance,
          timestamp: now,
        }),
      }).catch((e) => console.error("Outward transfer sync failed:", e));
    }

    return NextResponse.json({
      success: true,
      amount: transferAmount,
      newBalance: newSenderBalance,
      recipientName:
        recipientProfile.telegram_first_name ||
        recipientProfile.full_name ||
        `@${recipientProfile.telegram_username || recipientProfile.telegram_id}`,
    });
  } catch (error: any) {
    console.error("Transfer error:", error);
    return NextResponse.json(
      { error: error?.message || "Помилка переказу" },
      { status: 500 }
    );
  }
}
