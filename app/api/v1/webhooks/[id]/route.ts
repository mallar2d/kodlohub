import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { apiError, apiJson } from "@/lib/api/response";

export const DELETE = withApiAuth(
  async (request, ctx, routeCtx) => {
    const { id } = await routeCtx!.params;
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("webhook_subscriptions")
      .update({ active: false })
      .eq("id", id)
      .eq("api_key_id", ctx.keyId)
      .select("id, url, active")
      .maybeSingle();

    if (error) return apiError(request, error.message, 500);
    if (!data) return apiError(request, "Webhook not found", 404, "not_found");

    return apiJson(request, { success: true, webhook: data });
  },
  { scopes: ["write"] }
);

export const OPTIONS = DELETE;
