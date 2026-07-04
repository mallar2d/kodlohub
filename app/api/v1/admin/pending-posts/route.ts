import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { mapProfile } from "@/lib/api/helpers";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(
  async (request) => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("posts")
      .select("id, title, content, author_id, status, created_at, profiles(display_name, username, avatar_url)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) return apiError(request, error.message, 500);

    return apiJson(request, {
      posts: (data || []).map(mapProfile),
    });
  },
  { scopes: ["admin"] }
);

export const OPTIONS = GET;
