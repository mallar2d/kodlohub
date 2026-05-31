import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

type MediaInput = {
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  caption?: string;
  fileName?: string;
};

const ARTIFACT_TEXT_EXTS = ["txt", "md", "json", "xml", "csv", "log", "py", "js", "ts", "html", "css"];
const ARTIFACT_DOC_EXTS = ["pdf", "doc", "docx"];
const ARTIFACT_MUSIC_EXTS = ["mp3", "wav", "ogg", "flac", "aac"];

export async function POST(request: Request) {
  try {
    const { authorId, fileUrl, fileType, fileSize, caption, media } = await request.json();

    const items: MediaInput[] = Array.isArray(media)
      ? media
      : [{ fileUrl, fileType, fileSize, caption }];

    if (!authorId || items.length === 0 || items.some((item) => !item.fileUrl)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: existing } = await admin.from("profiles").select("id").eq("id", authorId).maybeSingle();
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
      .insert(items.map((item) => ({
        author_id: authorId,
        file_url: item.fileUrl,
        file_type: item.fileType || "document",
        file_size: item.fileSize || 0,
        caption: item.caption || "",
      })))
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await Promise.all(
      (data || []).map((item, index) =>
        logActivity(authorId, "media_uploaded", "media", item.id, {
          caption: items[index]?.caption,
          fileType: items[index]?.fileType,
        }),
      ),
    );

    const artifactRows = (data || []).flatMap((mediaItem, index) => {
      const item = items[index];
      if (!item || !item.fileName) return [];
      const ext = item.fileName.split(".").pop()?.toLowerCase() || "";
      const isArtifact = ARTIFACT_TEXT_EXTS.includes(ext) || ARTIFACT_DOC_EXTS.includes(ext) || ARTIFACT_MUSIC_EXTS.includes(ext) || (item.fileType || "").startsWith("audio/");
      if (!isArtifact) return [];
      return [{
        title: item.caption || item.fileName,
        description: `${(item.fileType || "").startsWith("audio/") ? "Музичний файл" : "Документ"}: ${item.fileName}`,
        category: "artifact",
        media_id: mediaItem.id,
        author_id: authorId,
      }];
    });

    if (artifactRows.length > 0) {
      await admin.from("lore_items").insert(artifactRows);
    }

    return NextResponse.json({ success: true, media: Array.isArray(media) ? data : data?.[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
