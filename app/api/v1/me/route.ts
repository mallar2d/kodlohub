import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request, ctx) => {
  const admin = createAdminClient();
  const { data: key } = await admin
    .from("api_keys")
    .select("id, name, key_prefix, scopes, rate_limit_per_minute, service_user_id, last_used_at, expires_at, created_at")
    .eq("id", ctx.keyId)
    .single();

  return apiJson(request, {
    key: {
      id: key?.id,
      name: key?.name,
      prefix: key?.key_prefix,
      scopes: key?.scopes,
      rateLimitPerMinute: key?.rate_limit_per_minute,
      serviceUserId: key?.service_user_id,
      lastUsedAt: key?.last_used_at,
      expiresAt: key?.expires_at,
      createdAt: key?.created_at,
    },
  });
});

export const OPTIONS = GET;
