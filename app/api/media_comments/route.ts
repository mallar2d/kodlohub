import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get("mediaId");

    if (!mediaId) {
      return NextResponse.json({ error: "Missing mediaId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("media_comments")
      .select("*, profiles(display_name, username, avatar_url)")
      .eq("media_id", mediaId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const comments = (data || []).map((c: any) => ({
      ...c,
      profiles: c.profiles?.[0] || null,
    }));

    return NextResponse.json({ comments });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { mediaId, content } = await request.json();

    if (!mediaId || !content?.trim()) {
      return NextResponse.json({ error: "Missing mediaId or content" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("media_comments")
      .insert({
        media_id: mediaId,
        author_id: user.id,
        content: content.trim(),
      })
      .select("*, profiles(display_name, username, avatar_url)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const comment = {
      ...data,
      profiles: (data as any).profiles?.[0] || null,
    };

    logActivity(user.id, "comment_created", "comment", data.id, { mediaId });

    return NextResponse.json({ comment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { commentId } = await request.json();

    if (!commentId) {
      return NextResponse.json({ error: "Missing commentId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { error } = await supabase
      .from("media_comments")
      .delete()
      .eq("id", commentId)
      .eq("author_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
