import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ results: { posts: [], media: [], lore: [] } });
    }

    const query = q.trim();
    const supabase = await createClient();

    const [postsRes, mediaRes, loreRes, wikiRes] = await Promise.all([
      supabase
        .from("posts")
        .select("id, title, content, created_at")
        .eq("status", "approved")
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(5),

      supabase
        .from("media")
        .select("id, file_url, file_type, caption, created_at")
        .or(`caption.ilike.%${query}%`)
        .in("file_type", ["image", "video"])
        .order("created_at", { ascending: false })
        .limit(5),

      supabase
        .from("lore_items")
        .select("id, title, description, category, created_at")
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(5),

      supabase
        .from("wiki_articles")
        .select("id, slug, title, content, view_count, wiki_categories(name, slug, icon)")
        .eq("is_published", true)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order("view_count", { ascending: false })
        .limit(5),
    ]);

    const wikiArticles = (wikiRes.data || []).map((a: any) => ({
      ...a,
      wiki_categories: Array.isArray(a.wiki_categories) ? a.wiki_categories[0] : a.wiki_categories || null,
    }));

    return NextResponse.json({
      results: {
        posts: postsRes.data || [],
        media: mediaRes.data || [],
        lore: loreRes.data || [],
        wiki: wikiArticles,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
