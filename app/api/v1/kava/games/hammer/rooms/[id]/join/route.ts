import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: "Не авторизовано" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("id, full_name, display_name, username, avatar_url, telegram_id, telegram_first_name, telegram_username, telegram_photo_url, kava_balance_cache")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, message: "Профіль не знайдено" }, { status: 404 });
    }

    const joinerId = profile.telegram_id || profile.id;
    const joinerName = profile.telegram_first_name || profile.display_name || profile.full_name || `@${profile.username}` || "Гравець";
    const joinerPhoto = profile.telegram_photo_url || profile.avatar_url || null;

    const { data: room, error: roomErr } = await admin
      .from("hammer_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomErr || !room) {
      return NextResponse.json({ success: false, message: "Кімнату не знайдено" }, { status: 404 });
    }

    if (room.status !== "waiting") {
      return NextResponse.json({ success: false, message: "Кімната вже зайнята або завершена" }, { status: 400 });
    }

    if (room.creator_id === joinerId) {
      return NextResponse.json({ success: false, message: "Не можна грати з самим собою" }, { status: 400 });
    }

    const joinerBalance = profile.kava_balance_cache || 0;
    if (joinerBalance < room.stake) {
      return NextResponse.json(
        { success: false, message: `Недостатньо кави (у тебе ${joinerBalance}, потрібно ${room.stake})` },
        { status: 400 }
      );
    }

    const { data: creatorProfile } = await admin
      .from("profiles")
      .select("id, telegram_id, kava_balance_cache")
      .or(`telegram_id.eq.${room.creator_id},id.eq.${room.creator_id}`)
      .maybeSingle();

    const creatorBalance = creatorProfile?.kava_balance_cache || 0;
    if (creatorBalance < room.stake) {
      return NextResponse.json(
        { success: false, message: "Творець кімнати вже не має достатньо кави для ставки" },
        { status: 400 }
      );
    }

    // Deduct stakes
    await admin.from("profiles").update({ kava_balance_cache: joinerBalance - room.stake }).eq("id", profile.id);
    if (creatorProfile) {
      await admin.from("profiles").update({ kava_balance_cache: creatorBalance - room.stake }).eq("id", creatorProfile.id);
    }

    const { data: updatedRoom, error: updateErr } = await admin
      .from("hammer_rooms")
      .update({
        joiner_id: joinerId,
        joiner_name: joinerName,
        joiner_photo_url: joinerPhoto,
        status: "playing",
        round_index: 1,
        creator_hp: 100,
        joiner_hp: 100,
        distance_state: "short",
        round_started_at: new Date().toISOString(),
      })
      .eq("id", roomId)
      .select()
      .single();

    if (updateErr || !updatedRoom) {
      return NextResponse.json({ success: false, message: "Помилка приєднання до битви" }, { status: 500 });
    }

    return NextResponse.json({ success: true, room: updatedRoom });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
