import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
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
      .select("id, telegram_id")
      .eq("id", user.id)
      .single();

    const playerId = profile?.telegram_id || profile?.id;

    const { data: room } = await admin
      .from("hammer_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (!room) {
      return NextResponse.json({ success: false, message: "Кімнату не знайдено" }, { status: 404 });
    }

    if (room.creator_id !== playerId) {
      return NextResponse.json({ success: false, message: "Тільки творець може скасувати кімнату" }, { status: 403 });
    }

    if (room.status !== "waiting") {
      return NextResponse.json({ success: false, message: "Неможливо скасувати активну або завершену битву" }, { status: 400 });
    }

    await admin.from("hammer_rooms").update({ status: "cancelled" }).eq("id", roomId);

    return NextResponse.json({ success: true, message: "Битву скасовано" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
