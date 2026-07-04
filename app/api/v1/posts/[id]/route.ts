import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request, _ctx, routeCtx) => {
  const { id } = await routeCtx!.params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("posts")
    .select("id, title, content, tags, status, created_at, updated_at, profiles(display_name, username, avatar_url, role)")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();

  if (error) {
    return apiError(request, error.message, 500);
  }

  if (!data) {
    return apiError(request, "Post not found", 404, "not_found");
  }

  return apiJson(request, {
    post: {
      ...data,
      profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles || null,
    },
  });
});

export const OPTIONS = GET;
