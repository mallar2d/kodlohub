import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const revalidate = 0;

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("urethra_scores")
      .select("id, user_id, player_name, skin, score, coffee_eaten, kills, duration_seconds, created_at")
      .order("score", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message, scores: [] });
    }

    return NextResponse.json({ ok: true, scores: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ ok: false, error: message, scores: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerName, skin, score, coffeeEaten, kills, durationSeconds } = body;

    if (!score || score < 5) {
      return NextResponse.json({ ok: false, reason: "invalid_score" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("urethra_scores")
      .insert({
        user_id: user?.id ?? null,
        player_name: (playerName || "Опариш").substring(0, 32),
        skin: (skin || "classic").substring(0, 32),
        score: Math.floor(score),
        coffee_eaten: Math.floor(coffeeEaten || 0),
        kills: Math.floor(kills || 0),
        duration_seconds: Math.floor(durationSeconds || 0),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, entry: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
