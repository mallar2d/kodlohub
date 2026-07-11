import { withApiAuth } from "@/lib/api/auth";
import { apiError, apiJson } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";

/** POST /api/arena/pair/revoke — logout from game (revoke current ka token). */
export const POST = withApiAuth(async (request, ctx) => {
  if (ctx.authKind !== "arena_token") {
    return apiError(request, "Only arena game tokens can be revoked here", 400, "wrong_auth");
  }
  const admin = createAdminClient();
  await admin
    .from("arena_game_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", ctx.keyId);
  return apiJson(request, { ok: true });
}, { scopes: ["write"] });

export const OPTIONS = POST;
