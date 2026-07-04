import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { mapProfile } from "@/lib/api/helpers";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request, _ctx, routeCtx) => {
  const { id } = await routeCtx!.params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("lore_items")
    .select("id, title, description, category, media_id, created_at, author_id, profiles(display_name, username, avatar_url), media(file_url, file_type, caption)")
    .eq("id", id)
    .maybeSingle();

  if (error) return apiError(request, error.message, 500);
  if (!data) return apiError(request, "Lore item not found", 404, "not_found");

  return apiJson(request, {
    lore: {
      ...mapProfile(data),
      media: Array.isArray(data.media) ? data.media[0] : data.media || null,
    },
  });
});

export const OPTIONS = GET;
