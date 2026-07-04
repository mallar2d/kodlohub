import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProjectCenterOwner } from "@/lib/project-center/auth";
import { isActionStyle, isActionType, optionalString, requireString } from "@/lib/project-center/validators";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireProjectCenterOwner();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("project_center_actions")
      .insert({
        project_id: id,
        label: requireString(body.label, "label"),
        url: requireString(body.url, "url"),
        action_type: isActionType(body.action_type) ? body.action_type : "read_more",
        icon: optionalString(body.icon) || "",
        style: isActionStyle(body.style) ? body.style : "secondary",
        open_new_tab: body.open_new_tab !== false,
        is_public: body.is_public !== false,
        sort_order: Number(body.sort_order || 0),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath("/projects");
    return NextResponse.json({ action: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireProjectCenterOwner();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const actionId = new URL(request.url).searchParams.get("actionId");
  if (!actionId) return NextResponse.json({ error: "actionId is required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("project_center_actions").delete().eq("id", actionId).eq("project_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/projects");
  return NextResponse.json({ success: true });
}
