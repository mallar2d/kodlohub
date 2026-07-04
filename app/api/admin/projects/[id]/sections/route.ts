import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProjectCenterOwner } from "@/lib/project-center/auth";
import { isProgressSectionScope, isProgressStatus, optionalString, parsePercent, parsePositiveWeight, parseSlug, requireString } from "@/lib/project-center/validators";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireProjectCenterOwner();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const title = requireString(body.title, "title");
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("project_center_progress_sections")
      .insert({
        project_id: id,
        parent_id: optionalString(body.parent_id),
        title,
        slug: parseSlug(body.slug, title),
        description: optionalString(body.description) || "",
        progress_percent: parsePercent(body.progress_percent, 0),
        progress_mode: body.progress_mode === "auto" ? "auto" : "manual",
        status: isProgressStatus(body.status) ? body.status : "not_started",
        weight: parsePositiveWeight(body.weight, 1),
        section_scope: isProgressSectionScope(body.section_scope) ? body.section_scope : "project",
        is_public: body.is_public !== false,
        sort_order: Number(body.sort_order || 0),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath("/projects");
    return NextResponse.json({ section: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
