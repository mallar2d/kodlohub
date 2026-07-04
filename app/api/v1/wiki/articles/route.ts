import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth, requireServiceUser } from "@/lib/api/auth";
import { dispatchWebhook } from "@/lib/api/webhooks";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 50);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const supabase = createAdminClient();

  let query = supabase
    .from("wiki_articles")
    .select("id, slug, title, content, view_count, created_at, updated_at, wiki_categories(name, slug, icon), profiles(display_name, username)", {
      count: "exact",
    })
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq("wiki_categories.slug", category);
  }

  const { data, error, count } = await query;

  if (error) {
    return apiError(request, error.message, 500);
  }

  const articles = (data || []).map((a) => ({
    ...a,
    wiki_categories: Array.isArray(a.wiki_categories) ? a.wiki_categories[0] : a.wiki_categories || null,
    profiles: Array.isArray(a.profiles) ? a.profiles[0] : a.profiles || null,
  }));

  return apiJson(request, {
    articles,
    pagination: { limit, offset, total: count ?? articles.length },
  });
});

export const POST = withApiAuth(
  async (request, ctx) => {
    const userCheck = requireServiceUser(request, ctx);
    if ("error" in userCheck) return userCheck.error;

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content : "";
    const categoryId = body.category_id || null;
    const editComment = body.edit_comment || "API створення";

    if (!title || !content) {
      return apiError(request, "title and content are required", 400);
    }

    const articleSlug =
      body.slug ||
      title
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();

    const admin = createAdminClient();

    const { data: article, error: articleError } = await admin
      .from("wiki_articles")
      .insert({
        title,
        slug: articleSlug,
        content,
        category_id: categoryId,
        author_id: userCheck.userId,
        is_published: true,
      })
      .select()
      .single();

    if (articleError) return apiError(request, articleError.message, 500);

    await admin.from("wiki_revisions").insert({
      article_id: article.id,
      content,
      title,
      author_id: userCheck.userId,
      edit_comment: editComment,
    });

    void dispatchWebhook("wiki.updated", { article, action: "created" });

    return apiJson(request, { article }, 201);
  },
  { scopes: ["admin"] }
);

export const OPTIONS = GET;
