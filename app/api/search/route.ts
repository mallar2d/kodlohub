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

    const [postsRes, mediaRes, loreRes] = await Promise.all([
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
    ]);

    return NextResponse.json({
      results: {
        posts: postsRes.data || [],
        media: mediaRes.data || [],
        lore: loreRes.data || [],
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
