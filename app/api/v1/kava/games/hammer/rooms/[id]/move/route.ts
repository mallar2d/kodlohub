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

    const body = await req.json();
    const action = String(body?.action || "").toLowerCase().trim(); // 'charge' | 'strike' | 'parry' | 'step'

    if (!["charge", "strike", "parry", "step"].includes(action)) {
      return NextResponse.json({ success: false, message: "Невідома дія (charge, strike, parry, step)" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("id, telegram_id")
      .eq("id", user.id)
      .single();

    const playerId = profile?.telegram_id || profile?.id;

    const { data: room, error: roomErr } = await admin
      .from("hammer_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomErr || !room) {
      return NextResponse.json({ success: false, message: "Кімнату не знайдено" }, { status: 404 });
    }

    if (room.status !== "playing") {
      return NextResponse.json({ success: false, message: "Гра не активна" }, { status: 400 });
    }

    const isCreator = room.creator_id === playerId;
    const isJoiner = room.joiner_id === playerId;

    if (!isCreator && !isJoiner) {
      return NextResponse.json({ success: false, message: "Ти не є учасником цієї битви" }, { status: 403 });
    }

    const currentRound = room.round_index;

    // Check if player already made a move this round
    const { data: existingAction } = await admin
      .from("hammer_actions")
      .select("*")
      .eq("room_id", roomId)
      .eq("round_index", currentRound)
      .eq("player_id", playerId)
      .maybeSingle();

    if (existingAction) {
      return NextResponse.json({ success: false, message: "Ти вже обрав дію на цей раунд" }, { status: 400 });
    }

    // Insert action
    await admin.from("hammer_actions").insert({
      room_id: roomId,
      round_index: currentRound,
      player_id: playerId,
      action,
      submitted_at: new Date().toISOString(),
    });

    // Check if opponent already submitted action
    const opponentId = isCreator ? room.joiner_id : room.creator_id;
    const { data: opponentAction } = await admin
      .from("hammer_actions")
      .select("*")
      .eq("room_id", roomId)
      .eq("round_index", currentRound)
      .eq("player_id", opponentId)
      .maybeSingle();

    if (!opponentAction) {
      return NextResponse.json({
        success: true,
        waiting_for_opponent: true,
        action,
        round: currentRound,
      });
    }

    // Both players have submitted moves -> RESOLVE ROUND!
    const creatorAction = isCreator ? action : opponentAction.action;
    const joinerAction = isJoiner ? action : opponentAction.action;

    let dist = room.distance_state;
    let creatorCharges = room.creator_charges;
    let joinerCharges = room.joiner_charges;

    let dmgToCreator = 0;
    let dmgToJoiner = 0;

    // Resolve charges
    if (creatorAction === "charge") creatorCharges += 1;
    if (joinerAction === "charge") joinerCharges += 1;

    // Resolve steps (toggles distance)
    if (creatorAction === "step" || joinerAction === "step") {
      if (creatorAction === "step" && joinerAction === "step") {
        // both step -> distance stays
      } else {
        dist = dist === "short" ? "long" : "short";
      }
    }

    // Creator strikes Joiner
    if (creatorAction === "strike") {
      let rawDmg = 18 + (dist === "short" ? 4 : -3) + (creatorCharges * 8);
      if (creatorCharges >= 3) rawDmg += 36; // Crit!
      creatorCharges = 0; // consumed

      if (joinerAction === "parry") {
        const blocked = 10 + (dist === "long" ? 4 : 0);
        rawDmg = Math.max(0, rawDmg - blocked);
        // Counter attack from joiner parry
        dmgToCreator += 8 + (dist === "long" ? 4 : 0);
      }
      dmgToJoiner += rawDmg;
    }

    // Joiner strikes Creator
    if (joinerAction === "strike") {
      let rawDmg = 18 + (dist === "short" ? 4 : -3) + (joinerCharges * 8);
      if (joinerCharges >= 3) rawDmg += 36; // Crit!
      joinerCharges = 0; // consumed

      if (creatorAction === "parry") {
        const blocked = 10 + (dist === "long" ? 4 : 0);
        rawDmg = Math.max(0, rawDmg - blocked);
        dmgToJoiner += 8 + (dist === "long" ? 4 : 0);
      }
      dmgToCreator += rawDmg;
    }

    const newCreatorHp = Math.max(0, room.creator_hp - dmgToCreator);
    const newJoinerHp = Math.max(0, room.joiner_hp - dmgToJoiner);

    const isGameOver =
      newCreatorHp <= 0 ||
      newJoinerHp <= 0 ||
      currentRound >= room.max_rounds;

    let winnerId: string | null = null;
    let resultReason: string | null = null;

    if (isGameOver) {
      if (newCreatorHp > newJoinerHp) {
        winnerId = room.creator_id;
        resultReason = `${room.creator_name} переміг молотком`;
      } else if (newJoinerHp > newCreatorHp) {
        winnerId = room.joiner_id;
        resultReason = `${room.joiner_name} переміг молотком`;
      } else {
        winnerId = null; // Draw
        resultReason = "Нічия на молотках";
      }

      // Payout
      const pot = room.stake * 2;
      if (winnerId) {
        const { data: winnerProfile } = await admin
          .from("profiles")
          .select("id, kava_balance_cache")
          .or(`telegram_id.eq.${winnerId},id.eq.${winnerId}`)
          .maybeSingle();

        if (winnerProfile) {
          const newBal = (winnerProfile.kava_balance_cache || 0) + pot;
          await admin.from("profiles").update({ kava_balance_cache: newBal }).eq("id", winnerProfile.id);

          await admin.from("kava_transactions_log").insert({
            user_id: winnerProfile.id,
            telegram_id: winnerId,
            action_type: "hammer_win",
            amount_change: pot - room.stake,
            balance_after: newBal,
            description: `Перемога у дуелі на молотках (+${pot - room.stake} KAVA)`,
            created_at: new Date().toISOString(),
          });
        }
      } else {
        // Refund on draw
        for (const pid of [room.creator_id, room.joiner_id]) {
          const { data: p } = await admin
            .from("profiles")
            .select("id, kava_balance_cache")
            .or(`telegram_id.eq.${pid},id.eq.${pid}`)
            .maybeSingle();
          if (p) {
            await admin.from("profiles").update({ kava_balance_cache: (p.kava_balance_cache || 0) + room.stake }).eq("id", p.id);
          }
        }
      }
    }

    // Update room
    const { data: updatedRoom } = await admin
      .from("hammer_rooms")
      .update({
        creator_hp: newCreatorHp,
        joiner_hp: newJoinerHp,
        creator_charges: creatorCharges,
        joiner_charges: joinerCharges,
        distance_state: dist,
        round_index: isGameOver ? currentRound : currentRound + 1,
        status: isGameOver ? "finished" : "playing",
        winner_id: winnerId,
        result_reason: resultReason,
        damage_creator: (room.damage_creator || 0) + dmgToCreator,
        damage_joiner: (room.damage_joiner || 0) + dmgToJoiner,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roomId)
      .select()
      .single();

    return NextResponse.json({
      success: true,
      resolved: true,
      room: updatedRoom,
      round_summary: {
        creator_action: creatorAction,
        joiner_action: joinerAction,
        damage_to_creator: dmgToCreator,
        damage_to_joiner: dmgToJoiner,
        is_game_over: isGameOver,
        winner_id: winnerId,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
