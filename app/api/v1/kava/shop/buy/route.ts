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

    if (itemErr || !item) {
      return NextResponse.json({ success: false, message: "Товар не знайдено або він недоступний" }, { status: 404 });
    }

    if (typeof item.quantity === "number" && item.quantity <= 0) {
      return NextResponse.json({ success: false, message: "Товар закінчився" }, { status: 400 });
    }

    // 2. Fetch user profile
    const { data: profile } = await admin
      .from("profiles")
      .select("id, full_name, display_name, username, telegram_id, telegram_first_name, telegram_username, kava_balance_cache")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, message: "Профіль не знайдено" }, { status: 404 });
    }

    const userBalance = profile.kava_balance_cache || 0;
    if (userBalance < item.price) {
      return NextResponse.json(
        { success: false, message: `Недостатньо кави (у тебе ${userBalance}, потрібно ${item.price} KAVA)` },
        { status: 400 }
      );
    }

    const newBalance = userBalance - item.price;
    const now = new Date().toISOString();

    // 3. Deduct balance
    await admin.from("profiles").update({ kava_balance_cache: newBalance }).eq("id", profile.id);

    // 4. Update item quantity if limited
    if (typeof item.quantity === "number") {
      await admin
        .from("kava_shop_items")
        .update({ quantity: item.quantity - 1 })
        .eq("id", item.id);
    }

    // 5. Record purchase
    await admin.from("kava_shop_purchases").insert({
      item_id: item.id,
      telegram_id: profile.telegram_id || profile.id,
      user_id: profile.id,
      username: profile.telegram_username || profile.username,
      first_name: profile.telegram_first_name || profile.display_name || profile.full_name,
      item_title: item.title,
      item_price: item.price,
      created_at: now,
    });

    // 6. Log transaction
    await admin.from("kava_transactions_log").insert({
      user_id: profile.id,
      telegram_id: profile.telegram_id || profile.id,
      action_type: "shop_purchase",
      amount_change: -item.price,
      balance_after: newBalance,
      description: `Купівля: ${item.title} (-${item.price} KAVA)`,
      created_at: now,
    });

    return NextResponse.json({
      success: true,
      message: `Успішно придбано: ${item.title}!`,
      newBalance,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
