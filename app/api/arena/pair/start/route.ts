import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PAIR_CODE_TTL_MS,
  generatePairCode,
  generatePollToken,
} from "@/lib/arena/auth";
import { corsHeaders, handleCorsPreflight } from "@/lib/api/cors";

export const revalidate = 0;

/** POST /api/arena/pair/start — game asks for a pairing code. */
export async function POST(request: Request) {
  const admin = createAdminClient();
  let code = generatePairCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await admin
      .from("arena_pair_codes")
      .select("code")
      .eq("code", code)
      .maybeSingle();
    if (!existing) break;
    code = generatePairCode();
  }

  const pollToken = generatePollToken();
  const expiresAt = new Date(Date.now() + PAIR_CODE_TTL_MS).toISOString();
  const { error } = await admin.from("arena_pair_codes").insert({
    code,
    poll_token: pollToken,
    expires_at: expiresAt,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders(request) });
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://kodlohub.vercel.app").replace(
    /\/+$/,
    "",
  );
  return NextResponse.json(
    {
      code,
      poll_token: pollToken,
      expires_at: expiresAt,
      link_url: `${site}/arena/link?code=${code}`,
    },
    { headers: corsHeaders(request) }
  );
}

export function OPTIONS(request: Request) {
  return handleCorsPreflight(request) ?? new Response(null, { status: 204, headers: corsHeaders(request) });
}
