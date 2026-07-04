import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { mapProfile } from "@/lib/api/helpers";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request, _ctx, routeCtx) => {
  const { id } = await routeCtx!.params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("media")
    .select("id, file_url, file_type, file_size, caption, created_at, author_id, profiles(display_name, username, avatar_url)")
    .eq("id", id)
    .maybeSingle();

  if (error) return apiError(request, error.message, 500);
  if (!data) return apiError(request, "Media not found", 404, "not_found");

  return apiJson(request, { media: mapProfile(data) });
});

export const OPTIONS = GET;
