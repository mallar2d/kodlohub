import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateArenaGameToken } from "@/lib/arena/auth";

export const revalidate = 0;

/** POST /api/arena/pair/confirm { code } — logged-in user links the game. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = String(body.code || "").toUpperCase().trim();
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("arena_pair_codes")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Code not found" }, { status: 404 });
  }
  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: "Code expired" }, { status: 410 });
  }
  if (row.confirmed_at) {
    return NextResponse.json({ error: "Code already used" }, { status: 409 });
  }

  const token = generateArenaGameToken();
  const { error: tokenErr } = await admin.from("arena_game_tokens").insert({
    user_id: user.id,
    key_prefix: token.prefix,
    key_hash: token.hash,
    label: "HALF BRAT",
  });
  if (tokenErr) {
    return NextResponse.json({ error: tokenErr.message }, { status: 500 });
  }

  const { error: updateErr } = await admin
    .from("arena_pair_codes")
    .update({
      user_id: user.id,
      confirmed_at: new Date().toISOString(),
      game_token_plain: token.rawKey,
    })
    .eq("code", code);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
