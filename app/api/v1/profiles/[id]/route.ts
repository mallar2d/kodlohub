import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request, _ctx, routeCtx) => {
  const { id } = await routeCtx!.params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, role, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return apiError(request, error.message, 500);
  }

  if (!data) {
    return apiError(request, "Profile not found", 404, "not_found");
  }

  return apiJson(request, { profile: data });
});

export const OPTIONS = GET;
