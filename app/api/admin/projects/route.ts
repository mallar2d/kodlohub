import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProjectCenterUser } from "@/lib/project-center/auth";
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

function projectPayload(body: Record<string, unknown>, userId: string, isOwner: boolean) {
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
    approval_status: isOwner ? "approved" : "pending",
    submitted_at: new Date().toISOString(),
    reviewed_by: isOwner ? userId : null,
    reviewed_at: isOwner ? new Date().toISOString() : null,
    review_note: null,
    created_by: userId,
  };
}

export async function POST(request: Request) {
  const auth = await requireProjectCenterUser();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const payload = projectPayload(body, auth.user.id, auth.role === "owner");
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("project_center_projects")
      .insert(payload)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    revalidatePath("/projects");
    revalidatePath("/sitemap.xml");
    return NextResponse.json({ project: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
