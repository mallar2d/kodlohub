import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requireProjectCenterUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { user, role: profile?.role || null };
}

export async function requireProjectCenterOwner() {
  const auth = await requireProjectCenterUser();
  if ("error" in auth) return auth;

  const { user, role } = auth;
  if (role !== "owner") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user };
}

export async function requireCanManageProject(projectId: string) {
  const auth = await requireProjectCenterUser();
  if ("error" in auth) return auth;

  const admin = createAdminClient();
  const { data: project, error } = await admin
    .from("project_center_projects")
    .select("id, slug, created_by")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    return { error: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
  }

  if (auth.role !== "owner" && project.created_by !== auth.user.id) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user: auth.user, role: auth.role, project };
}
