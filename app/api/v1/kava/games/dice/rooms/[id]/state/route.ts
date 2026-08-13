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
      .from("dice_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomErr || !room) {
      return NextResponse.json({ success: false, message: "Кімнату не знайдено" }, { status: 404 });
    }

    const { data: rolls } = await admin
      .from("dice_rolls")
      .select("*")
      .eq("room_id", roomId)
      .order("id", { ascending: true });

    const creatorRolls = (rolls || []).filter((r) => r.player_id === room.creator_id);
    const joinerRolls = (rolls || []).filter((r) => r.player_id === room.joiner_id);

    const creatorScore = creatorRolls.reduce((acc, r) => acc + r.roll_value, 0);
    const joinerScore = joinerRolls.reduce((acc, r) => acc + r.roll_value, 0);

    return NextResponse.json({
      success: true,
      room,
      rolls: rolls || [],
      creator_score: creatorScore,
      joiner_score: joinerScore,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
