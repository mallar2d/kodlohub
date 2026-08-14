import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRetiredKavaShopItem } from "@/lib/kava-shop";
import { randomUUID } from "node:crypto";
import {
  adjustPodroidKava,
  PodroidKavaIntegrationError,
} from "@/lib/podroid-kava";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: "Не авторизовано" }, { status: 401 });
    }

    const body = await req.json();
    const itemId = parseInt(body?.itemId, 10);

    if (!itemId || isNaN(itemId)) {
      return NextResponse.json({ success: false, message: "Вкажи коректний товар" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Fetch item
    const { data: item, error: itemErr } = await admin
      .from("kava_shop_items")
      .select("*")
      .eq("id", itemId)
      .eq("active", true)
      .single();

    if (itemErr || !item || isRetiredKavaShopItem(item.title)) {
      return NextResponse.json({ success: false, message: "Товар не знайдено або він недоступний" }, { status: 404 });
    }

    if (typeof item.quantity === "number" && item.quantity <= 0) {
      return NextResponse.json({ success: false, message: "Товар закінчився" }, { status: 400 });
    }

    // 2. Fetch user profile
    const { data: profile } = await admin
      .from("profiles")
      .select("id, display_name, username, telegram_id, telegram_first_name, telegram_username")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, message: "Профіль не знайдено" }, { status: 404 });
    }

    if (!profile.telegram_id) {
      return NextResponse.json(
        { success: false, message: "Спочатку підключи Telegram акаунт" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const operationId = `shop:${profile.id}:${item.id}:${randomUUID()}`;
    const adjustment = await adjustPodroidKava({
      operationId,
      adjustments: [
        {
          telegramId: String(profile.telegram_id),
          delta: -item.price,
          description: `KodloHUB purchase: ${item.title}`,
        },
      ],
    });
    if (!adjustment.success || !adjustment.balances?.length) {
      return NextResponse.json(
        { success: false, message: adjustment.message },
        { status: 400 }
      );
    }
    const newBalance = adjustment.balances[0].newBalance;

    try {
      if (typeof item.quantity === "number") {
        const { error: quantityError } = await admin
          .from("kava_shop_items")
          .update({ quantity: item.quantity - 1 })
          .eq("id", item.id);
        if (quantityError) throw quantityError;
      }

      const { error: purchaseError } = await admin
        .from("kava_shop_purchases")
        .insert({
          item_id: item.id,
          telegram_id: profile.telegram_id,
          user_id: profile.id,
          username: profile.telegram_username || profile.username,
          first_name: profile.telegram_first_name || profile.display_name,
          item_title: item.title,
          item_price: item.price,
          created_at: now,
        });
      if (purchaseError) throw purchaseError;
    } catch (purchaseError) {
      await adjustPodroidKava({
        operationId: `${operationId}:refund`,
        adjustments: [
          {
            telegramId: String(profile.telegram_id),
            delta: item.price,
            description: `KodloHUB purchase rollback: ${item.title}`,
          },
        ],
      });
      throw purchaseError;
    }

    return NextResponse.json({
      success: true,
      message: `Успішно придбано: ${item.title}!`,
      newBalance,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Помилка покупки";
    return NextResponse.json(
      { success: false, message },
      { status: error instanceof PodroidKavaIntegrationError ? 503 : 500 }
    );
  }
}
