import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { authorId, fileUrl, fileType, fileSize, caption } = await request.json();

    if (!authorId || !fileUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Ensure profile exists
    const { data: existing } = await admin.from("profiles").select("id").eq("id", authorId).single();
    if (!existing) {
      const { data: userData } = await admin.auth.admin.getUserById(authorId);
      const meta = userData?.user?.user_metadata || {};
      await admin.from("profiles").upsert({
        id: authorId,
        username: meta.email?.split("@")[0] || `user_${authorId.slice(0, 8)}`,
        display_name: meta.full_name || meta.name || "Учасник кодла",
        avatar_url: meta.avatar_url || meta.picture || null,
        bio: "",
      }, { onConflict: "id" });
    }

    const { data, error } = await admin
      .from("media")
      .insert({
        author_id: authorId,
        file_url: fileUrl,
        file_type: fileType || "document",
        file_size: fileSize || 0,
        caption: caption || "",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, media: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
