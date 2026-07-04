import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProjectCenterOwner } from "@/lib/project-center/auth";
import { isProgressStatus, optionalString, parsePercent, parsePositiveWeight, parseSlug, requireString } from "@/lib/project-center/validators";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; sectionId: string }> }) {
  const auth = await requireProjectCenterOwner();
  if ("error" in auth) return auth.error;

  try {
    const { id, sectionId } = await params;
    const body = await request.json();
    const title = requireString(body.title, "title");
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("project_center_progress_sections")
      .update({
        parent_id: optionalString(body.parent_id),
        title,
        slug: parseSlug(body.slug, title),
        description: optionalString(body.description) || "",
        progress_percent: parsePercent(body.progress_percent, 0),
        progress_mode: body.progress_mode === "auto" ? "auto" : "manual",
        status: isProgressStatus(body.status) ? body.status : "not_started",
        weight: parsePositiveWeight(body.weight, 1),
        is_public: body.is_public !== false,
        sort_order: Number(body.sort_order || 0),
      })
      .eq("id", sectionId)
      .eq("project_id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath("/projects");
    return NextResponse.json({ section: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; sectionId: string }> }) {
  const auth = await requireProjectCenterOwner();
  if ("error" in auth) return auth.error;

  const { id, sectionId } = await params;
  const admin = createAdminClient();
  const { error } = await admin
    .from("project_center_progress_sections")
    .delete()
    .eq("id", sectionId)
    .eq("project_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/projects");
  return NextResponse.json({ success: true });
}
