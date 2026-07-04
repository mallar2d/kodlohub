import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request, _ctx, routeCtx) => {
  const { slug } = await routeCtx!.params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("wiki_articles")
    .select("id, slug, title, content, view_count, created_at, updated_at, wiki_categories(name, slug, icon), profiles(display_name, username, avatar_url)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    return apiError(request, error.message, 500);
  }

  if (!data) {
    return apiError(request, "Article not found", 404, "not_found");
  }

  await supabase
    .from("wiki_articles")
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq("id", data.id);

  return apiJson(request, {
    article: {
      ...data,
      wiki_categories: Array.isArray(data.wiki_categories) ? data.wiki_categories[0] : data.wiki_categories || null,
      profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles || null,
    },
  });
});

export const OPTIONS = GET;
