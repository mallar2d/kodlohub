import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("podcast_episodes")
      .select("*, profiles(display_name, username, avatar_url)")
      .eq("is_published", true)
      .order("episode_number", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const episodes = (data || []).map((e: any) => ({
      ...e,
      profiles: Array.isArray(e.profiles) ? e.profiles[0] : e.profiles || null,
    }));

    return NextResponse.json({ episodes });
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
    const { title, description, audio_url, duration, episode_number } = body;

    if (!title || !audio_url || !episode_number) {
      return NextResponse.json({ error: "Title, audio_url and episode_number are required" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    const { data: episode, error } = await adminSupabase
      .from("podcast_episodes")
      .insert({
        title,
        description: description || "",
        audio_url,
        duration: duration || 0,
        episode_number,
        author_id: user.id,
        is_published: true,
      })
      .select("*, profiles(display_name, username, avatar_url)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ episode }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
