import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProjectCenterOwner } from "@/lib/project-center/auth";
import { isUpdateStatus, isUpdateType, optionalString, parseSlug, requireString } from "@/lib/project-center/validators";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireProjectCenterOwner();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const title = requireString(body.title, "title");
    const status = isUpdateStatus(body.status) ? body.status : "draft";
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("project_center_updates")
      .insert({
        project_id: id,
        slug: parseSlug(body.slug, title),
        title,
        summary: optionalString(body.summary) || "",
        body_markdown: optionalString(body.body_markdown) || "",
        update_type: isUpdateType(body.update_type) ? body.update_type : "devlog",
        status,
        cover_image_url: optionalString(body.cover_image_url),
        is_pinned: Boolean(body.is_pinned),
        published_at: status === "published" ? optionalString(body.published_at) || new Date().toISOString() : optionalString(body.published_at),
        progress_changes: typeof body.progress_changes === "object" && body.progress_changes ? body.progress_changes : {},
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath("/projects");
    revalidatePath("/projects/updates");
    return NextResponse.json({ update: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
