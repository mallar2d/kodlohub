import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
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
      .select("id, display_name, username, avatar_url, telegram_id, telegram_first_name, telegram_username, telegram_photo_url, kava_balance_cache")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, message: "Профіль не знайдено" }, { status: 404 });
    }

    const balance = profile.kava_balance_cache || 0;
    if (balance < stake) {
      return NextResponse.json(
        { success: false, message: `Недостатньо кави (у тебе ${balance}, потрібно ${stake})` },
        { status: 400 }
      );
    }

    const playerId = profile.telegram_id || profile.id;
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
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
