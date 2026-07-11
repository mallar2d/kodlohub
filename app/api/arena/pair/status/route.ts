import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { effectiveArenaNick, loadArenaProfile } from "@/lib/arena/auth";

export const revalidate = 0;

/** GET /api/arena/pair/status?code=&poll_token= — game polls until confirmed. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") || "").toUpperCase().trim();
  const pollToken = url.searchParams.get("poll_token") || "";
  if (!code || !pollToken) {
    return NextResponse.json({ error: "code and poll_token required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("arena_pair_codes")
    .select("*")
    .eq("code", code)
    .eq("poll_token", pollToken)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ status: "invalid" }, { status: 404 });
  }
  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ status: "expired" });
  }
  if (!row.confirmed_at || !row.user_id || !row.game_token_plain) {
    return NextResponse.json({ status: "pending" });
  }
  if (row.consumed_at) {
    return NextResponse.json({ status: "consumed" });
  }

  await admin
    .from("arena_pair_codes")
    .update({ consumed_at: new Date().toISOString(), game_token_plain: null })
    .eq("code", code);

  const profile = await loadArenaProfile(row.user_id);
  return NextResponse.json({
    status: "ready",
    access_token: row.game_token_plain,
    profile: profile
      ? {
          user_id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          game_nick: profile.game_nick,
          effective_nick: effectiveArenaNick(profile),
        }
      : null,
  });
}
