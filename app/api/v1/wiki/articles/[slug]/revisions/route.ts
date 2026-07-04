import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { mapProfile } from "@/lib/api/helpers";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request, _ctx, routeCtx) => {
  const { slug } = await routeCtx!.params;
  const admin = createAdminClient();

  const { data: article } = await admin
    .from("wiki_articles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!article) return apiError(request, "Article not found", 404, "not_found");

  const { data, error } = await admin
    .from("wiki_revisions")
    .select("id, title, content, edit_comment, created_at, author_id, profiles(display_name, username)")
    .eq("article_id", article.id)
    .order("created_at", { ascending: false });

  if (error) return apiError(request, error.message, 500);

  return apiJson(request, {
    revisions: (data || []).map(mapProfile),
  });
});

export const OPTIONS = GET;
