import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const slug = searchParams.get("slug");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const supabase = createAdminClient();

    let query = supabase
      .from("wiki_articles")
      .select("*, wiki_categories(name, slug, icon), profiles(display_name, username)")
      .eq("is_published", true)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq("wiki_categories.slug", category);
    }

    if (slug) {
      query = query.eq("slug", slug);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const articles = (data || []).map((a: any) => ({
      ...a,
      wiki_categories: Array.isArray(a.wiki_categories) ? a.wiki_categories[0] : a.wiki_categories || null,
      profiles: Array.isArray(a.profiles) ? a.profiles[0] : a.profiles || null,
    }));

    return NextResponse.json({ articles });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "owner" && profile.role !== "podrofikovany")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, slug, content, category_id, edit_comment } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const articleSlug = slug || title.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();

    const adminSupabase = createAdminClient();

    const { data: article, error: articleError } = await adminSupabase
      .from("wiki_articles")
      .insert({
        title,
        slug: articleSlug,
        content,
        category_id: category_id || null,
        author_id: user.id,
        is_published: true,
      })
      .select()
      .single();

    if (articleError) {
      return NextResponse.json({ error: articleError.message, details: articleError }, { status: 500 });
    }

    await adminSupabase.from("wiki_revisions").insert({
      article_id: article.id,
      content,
      title,
      author_id: user.id,
      edit_comment: edit_comment || "Перша версія",
    });

    return NextResponse.json({ article }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
