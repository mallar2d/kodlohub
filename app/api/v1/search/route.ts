import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return apiJson(request, { results: { posts: [], media: [], lore: [], wiki: [] } });
  }

  const query = q.trim();
  const supabase = createAdminClient();

  const [postsRes, mediaRes, loreRes, wikiRes] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, content, tags, created_at, profiles(display_name, username)")
      .eq("status", "approved")
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("media")
      .select("id, file_url, file_type, caption, created_at, profiles(display_name, username)")
      .or(`caption.ilike.%${query}%`)
      .in("file_type", ["image", "video"])
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("lore_items")
      .select("id, title, description, category, created_at")
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("wiki_articles")
      .select("id, slug, title, content, view_count, wiki_categories(name, slug, icon)")
      .eq("is_published", true)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order("view_count", { ascending: false })
      .limit(10),
  ]);

  const wiki = (wikiRes.data || []).map((a) => ({
    ...a,
    wiki_categories: Array.isArray(a.wiki_categories) ? a.wiki_categories[0] : a.wiki_categories || null,
  }));

  const posts = (postsRes.data || []).map((p) => ({
    ...p,
    profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles || null,
  }));

  const media = (mediaRes.data || []).map((m) => ({
    ...m,
    profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles || null,
  }));

  if (postsRes.error) {
    return apiError(request, postsRes.error.message, 500);
  }

  return apiJson(request, {
    results: {
      posts,
      media,
      lore: loreRes.data || [],
      wiki,
    },
  });
});

export const OPTIONS = GET;
