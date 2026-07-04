import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProjectCenterOwner } from "@/lib/project-center/auth";
import { optionalString, requireString } from "@/lib/project-center/validators";

const galleryKinds = ["image", "video", "embed"];
const galleryRoles = ["screenshot", "cover", "logo", "concept", "old_screenshot", "comparison", "trailer", "social_preview", "other"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireProjectCenterOwner();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const kind = typeof body.kind === "string" && galleryKinds.includes(body.kind) ? body.kind : "image";
    const role = typeof body.role === "string" && galleryRoles.includes(body.role) ? body.role : "screenshot";
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("project_center_gallery_items")
      .insert({
        project_id: id,
        update_id: optionalString(body.update_id),
        media_id: optionalString(body.media_id),
        kind,
        role,
        url: requireString(body.url, "url"),
        thumbnail_url: optionalString(body.thumbnail_url),
        title: optionalString(body.title) || "",
        caption: optionalString(body.caption) || "",
        is_public: body.is_public !== false,
        is_hero: Boolean(body.is_hero),
        is_social_preview: Boolean(body.is_social_preview),
        sort_order: Number(body.sort_order || 0),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath("/projects");
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireProjectCenterOwner();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const itemId = new URL(request.url).searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId is required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("project_center_gallery_items").delete().eq("id", itemId).eq("project_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/projects");
  return NextResponse.json({ success: true });
}
