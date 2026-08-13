import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TARGET_SCORE = 22;

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

    // 1. Fetch player
    const { data: profile } = await admin
      .from("profiles")
      .select("id, telegram_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, message: "Профіль не знайдено" }, { status: 404 });
    }

    const playerId = profile.telegram_id || profile.id;

    // 2. Fetch room
    const { data: room, error: roomErr } = await admin
      .from("dice_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomErr || !room) {
      return NextResponse.json({ success: false, message: "Кімнату не знайдено" }, { status: 404 });
    }

    if (room.status !== "playing") {
      return NextResponse.json({ success: false, message: "Гра не активна" }, { status: 400 });
    }

    if (room.current_turn !== playerId) {
      return NextResponse.json({ success: false, message: "Зараз не твій хід" }, { status: 400 });
    }

    // 3. Roll d6 (1 to 6)
    const rollValue = Math.floor(Math.random() * 6) + 1;

    // Calculate current player's previous total
    const { data: previousRolls } = await admin
      .from("dice_rolls")
      .select("roll_value")
      .eq("room_id", roomId)
      .eq("player_id", playerId);

    const prevTotal = (previousRolls || []).reduce((acc, r) => acc + r.roll_value, 0);
    const newTotal = prevTotal + rollValue;

    // Insert roll
    await admin.from("dice_rolls").insert({
      room_id: roomId,
      player_id: playerId,
      roll_value: rollValue,
      player_total: newTotal,
      rolled_at: new Date().toISOString(),
    });

    const isWinner = newTotal >= TARGET_SCORE;
    const nextTurn = playerId === room.creator_id ? room.joiner_id : room.creator_id;

    if (isWinner) {
      // Payout winner
      const pot = room.stake * 2;
      const { data: winnerProfile } = await admin
        .from("profiles")
        .select("id, kava_balance_cache")
        .or(`telegram_id.eq.${playerId},id.eq.${playerId}`)
        .maybeSingle();

      if (winnerProfile) {
        const newBal = (winnerProfile.kava_balance_cache || 0) + pot;
        await admin.from("profiles").update({ kava_balance_cache: newBal }).eq("id", winnerProfile.id);

        await admin.from("kava_transactions_log").insert({
          user_id: winnerProfile.id,
          telegram_id: playerId,
          action_type: "dice_win",
          amount_change: pot - room.stake,
          balance_after: newBal,
          description: `Перемога у битві кубів (+${pot - room.stake} KAVA)`,
          created_at: new Date().toISOString(),
        });
      }

      await admin
        .from("dice_rooms")
        .update({
          status: "finished",
          winner_id: playerId,
          current_turn: null,
        })
        .eq("id", roomId);

      return NextResponse.json({
        success: true,
        roll: {
          roll_value: rollValue,
          player_total: newTotal,
          winner: true,
          winner_id: playerId,
        },
      });
    }

    // Switch turn
    await admin
      .from("dice_rooms")
      .update({ current_turn: nextTurn })
      .eq("id", roomId);

    return NextResponse.json({
      success: true,
      roll: {
        roll_value: rollValue,
        player_total: newTotal,
        winner: false,
        next_turn: nextTurn,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
