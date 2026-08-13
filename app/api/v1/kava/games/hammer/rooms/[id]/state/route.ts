import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const admin = createAdminClient();

    const { data: room, error: roomErr } = await admin
      .from("hammer_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomErr || !room) {
      return NextResponse.json({ success: false, message: "Кімнату не знайдено" }, { status: 404 });
    }

    const { data: actions } = await admin
      .from("hammer_actions")
      .select("*")
      .eq("room_id", roomId)
      .order("round_index", { ascending: true });

    return NextResponse.json({
      success: true,
      room,
      actions: actions || [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
