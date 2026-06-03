import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const query = q.trim();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("wiki_articles")
      .select("id, slug, title, content, category_id, view_count, updated_at, wiki_categories(name, slug, icon)")
      .eq("is_published", true)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order("view_count", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = (data || []).map((a: any) => ({
      ...a,
      wiki_categories: Array.isArray(a.wiki_categories) ? a.wiki_categories[0] : a.wiki_categories || null,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
