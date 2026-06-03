import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: articles, error } = await supabase
      .from("wiki_articles")
      .select("id, slug, title, is_published, category_id, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: categories } = await supabase
      .from("wiki_categories")
      .select("id, name, slug");

    return NextResponse.json({
      articles: articles || [],
      categories: categories || [],
      count: articles?.length || 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
