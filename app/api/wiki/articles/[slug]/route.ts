import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = createAdminClient();

    const { data: article, error } = await supabase
      .from("wiki_articles")
      .select("*, wiki_categories(name, slug, icon), profiles(display_name, username, avatar_url)")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (error || !article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    await supabase
      .from("wiki_articles")
      .update({ view_count: (article.view_count || 0) + 1 })
      .eq("id", article.id);

    const result = {
      ...article,
      wiki_categories: Array.isArray(article.wiki_categories) ? article.wiki_categories[0] : article.wiki_categories || null,
      profiles: Array.isArray(article.profiles) ? article.profiles[0] : article.profiles || null,
    };

    return NextResponse.json({ article: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
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
    const { title, content, category_id, edit_comment, new_slug } = body;

    const adminSupabase = createAdminClient();

    const { data: existing } = await adminSupabase
      .from("wiki_articles")
      .select("id, title, content")
      .eq("slug", slug)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (new_slug && new_slug !== slug) updateData.slug = new_slug;

    const { error: updateError } = await adminSupabase
      .from("wiki_articles")
      .update(updateData)
      .eq("id", existing.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (content || title) {
      await adminSupabase.from("wiki_revisions").insert({
        article_id: existing.id,
        content: content || existing.content,
        title: title || existing.title,
        author_id: user.id,
        edit_comment: edit_comment || "",
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
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

    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
      .from("wiki_articles")
      .delete()
      .eq("slug", slug);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
