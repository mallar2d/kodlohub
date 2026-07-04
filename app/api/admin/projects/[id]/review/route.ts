import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProjectCenterOwner } from "@/lib/project-center/auth";
import { optionalString } from "@/lib/project-center/validators";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireProjectCenterOwner();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action === "reject" ? "reject" : "approve";
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("project_center_projects")
      .update({
        approval_status: action === "approve" ? "approved" : "rejected",
        reviewed_by: auth.user.id,
        reviewed_at: new Date().toISOString(),
        review_note: optionalString(body.review_note),
      })
      .eq("id", id)
      .select("slug")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    revalidatePath("/projects");
    revalidatePath("/admin/projects");
    if (data?.slug) revalidatePath(`/projects/${data.slug}`);
    return NextResponse.json({ success: true, approval_status: action === "approve" ? "approved" : "rejected" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
