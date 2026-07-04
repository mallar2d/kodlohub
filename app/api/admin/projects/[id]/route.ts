import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCanManageProject } from "@/lib/project-center/auth";
import {
  isProjectPriority,
  isProjectStatus,
  isProjectVisibility,
  optionalString,
  parsePercent,
  parseSlug,
  parseStringArray,
  requireString,
} from "@/lib/project-center/validators";

function updatePayload(body: Record<string, unknown>) {
  const title = requireString(body.title, "title");
  const status = isProjectStatus(body.status) ? body.status : "planned";
  const priority = isProjectPriority(body.priority) ? body.priority : "medium";
  const visibility = isProjectVisibility(body.visibility) ? body.visibility : "draft";
  return {
    title,
    slug: parseSlug(body.slug, title),
    one_liner: optionalString(body.one_liner) || "",
    short_description: requireString(body.short_description, "short_description"),
    full_description_markdown: optionalString(body.full_description_markdown) || "",
    status,
    priority,
    visibility,
    types: parseStringArray(body.types),
    tags: parseStringArray(body.tags),
    accent_color: optionalString(body.accent_color) || "#ffffff",
    cover_image_url: optionalString(body.cover_image_url),
    hero_image_url: optionalString(body.hero_image_url),
    logo_url: optionalString(body.logo_url),
    social_image_url: optionalString(body.social_image_url),
    progress_percent: parsePercent(body.progress_percent, 0),
    progress_mode: body.progress_mode === "manual" ? "manual" : "auto",
    is_featured: Boolean(body.is_featured),
    pinned_notice_title: optionalString(body.pinned_notice_title),
    pinned_notice_body: optionalString(body.pinned_notice_body),
    private_notes: optionalString(body.private_notes),
  };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireCanManageProject(id);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const payload = updatePayload(body);
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("project_center_projects")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    revalidatePath("/projects");
    revalidatePath(`/projects/${data.slug}`);
    revalidatePath("/sitemap.xml");
    return NextResponse.json({ project: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireCanManageProject(id);
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("project_center_projects")
    .update({ visibility: "archived", status: "archived" })
    .eq("id", id)
    .select("slug")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/projects");
  if (data?.slug) revalidatePath(`/projects/${data.slug}`);
  return NextResponse.json({ success: true });
}
