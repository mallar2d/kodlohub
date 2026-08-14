import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPodroidKavaState,
  PodroidKavaIntegrationError,
} from "@/lib/podroid-kava";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: rooms, error } = await admin
      .from("hammer_rooms")
      .select("*")
      .in("status", ["waiting", "playing"])
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Error fetching hammer rooms:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, rooms: rooms || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Помилка кімнат";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

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
    const stake = parseInt(body?.stake, 10);

    if (!stake || isNaN(stake) || stake < 1) {
      return NextResponse.json({ success: false, message: "≥1 нахуй" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("id, display_name, username, avatar_url, telegram_id, telegram_first_name, telegram_username, telegram_photo_url")
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
    const state = await getPodroidKavaState(String(profile.telegram_id));
    if (state.balance < stake) {
      return NextResponse.json(
        { success: false, message: `Недостатньо кави (у тебе ${state.balance}, потрібно ${stake})` },
        { status: 400 }
      );
    }

    const playerId = profile.telegram_id;
    const playerName = profile.telegram_first_name || profile.display_name || `@${profile.username}` || "Гравець";
    const playerPhoto = profile.telegram_photo_url || profile.avatar_url || null;

    const { data: room, error: insertErr } = await admin
      .from("hammer_rooms")
      .insert({
        creator_id: playerId,
        creator_name: playerName,
        creator_photo_url: playerPhoto,
        stake,
        status: "waiting",
        creator_hp: 100,
        joiner_hp: 100,
        distance_state: "short",
        round_index: 1,
      })
      .select()
      .single();

    if (insertErr || !room) {
      console.error("Hammer create error:", insertErr);
      return NextResponse.json({ success: false, message: "Помилка створення кімнати" }, { status: 500 });
    }

    return NextResponse.json({ success: true, room });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Помилка створення кімнати";
    return NextResponse.json(
      { success: false, message },
      { status: error instanceof PodroidKavaIntegrationError ? 503 : 500 }
    );
  }
}
