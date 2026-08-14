import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adjustPodroidKava,
  PodroidKavaIntegrationError,
} from "@/lib/podroid-kava";

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

    // 1. Fetch joiner profile
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
    const joinerId = String(profile.telegram_id);
    const joinerName = profile.telegram_first_name || profile.display_name || `@${profile.username}` || "Гравець";
    const joinerPhoto = profile.telegram_photo_url || profile.avatar_url || null;

    // 2. Fetch room
    const { data: room, error: roomErr } = await admin
      .from("dice_rooms")
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

    const { data: creatorProfile } = await admin
      .from("profiles")
      .select("id, telegram_id")
      .eq("telegram_id", room.creator_id)
      .maybeSingle();

    if (!creatorProfile?.telegram_id) {
      return NextResponse.json(
        { success: false, message: "У творця кімнати не підключено Telegram" },
        { status: 400 }
      );
    }

    const operationId = `dice:${roomId}:stakes`;
    const stakeResult = await adjustPodroidKava({
      operationId,
      adjustments: [
        {
          telegramId: String(creatorProfile.telegram_id),
          delta: -room.stake,
          description: `KodloHUB dice stake ${roomId}`,
        },
        {
          telegramId: joinerId,
          delta: -room.stake,
          description: `KodloHUB dice stake ${roomId}`,
        },
      ],
    });
    if (!stakeResult.success) {
      return NextResponse.json(
        { success: false, message: stakeResult.message },
        { status: 400 }
      );
    }

    const firstTurn = Math.random() < 0.5 ? room.creator_id : joinerId;

    // 5. Update room status
    const { data: updatedRoom, error: updateErr } = await admin
      .from("dice_rooms")
      .update({
        joiner_id: joinerId,
        joiner_name: joinerName,
        joiner_photo_url: joinerPhoto,
        status: "playing",
        current_turn: firstTurn,
      })
      .eq("id", roomId)
      .eq("status", "waiting")
      .select()
      .maybeSingle();

    if (updateErr || !updatedRoom) {
      if (!stakeResult.replayed) {
        await adjustPodroidKava({
          operationId: `${operationId}:refund`,
          adjustments: [
            {
              telegramId: String(creatorProfile.telegram_id),
              delta: room.stake,
              description: `KodloHUB dice stake rollback ${roomId}`,
            },
            {
              telegramId: joinerId,
              delta: room.stake,
              description: `KodloHUB dice stake rollback ${roomId}`,
            },
          ],
        });
      }
      return NextResponse.json({ success: false, message: "Помилка приєднання до кімнати" }, { status: 500 });
    }

    return NextResponse.json({ success: true, room: updatedRoom });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Помилка приєднання";
    return NextResponse.json(
      { success: false, message },
      { status: error instanceof PodroidKavaIntegrationError ? 503 : 500 }
    );
  }
}
