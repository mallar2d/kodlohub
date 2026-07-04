import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiScope } from "@/lib/api/types";
import { NextResponse } from "next/server";

async function requireOwner() {
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

  if (!profile || profile.role !== "owner") {
    return { error: NextResponse.json({ error: "Forbidden — owner only" }, { status: 403 }) };
  }

  return { user };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ canManage: false, reason: "not_logged_in" });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "owner") {
    return NextResponse.json({ canManage: true, isOwner: true });
  }

  const admin = createAdminClient();
  const { data: grant } = await admin
    .from("api_key_grants")
    .select("allowed_scopes, max_rate_limit_per_minute, allow_admin_scope, note, created_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .maybeSingle();

  if (!grant) {
    return NextResponse.json({ canManage: false, reason: "no_grant" });
  }

  return NextResponse.json({
    canManage: true,
    isOwner: false,
    grant,
  });
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  const allowedScopes = Array.isArray(body.allowed_scopes)
    ? body.allowed_scopes.filter((s: string) => ["read", "write", "admin"].includes(s))
    : ["read"];
  const maxRate =
    typeof body.max_rate_limit_per_minute === "number"
      ? Math.min(Math.max(body.max_rate_limit_per_minute, 1), 1000)
      : 60;
  const allowAdmin = body.allow_admin_scope === true;
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!userId) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  if (userId === auth.user.id) {
    return NextResponse.json({ error: "Owner does not need a grant" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("id, display_name, username").eq("id", userId).maybeSingle();
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const scopes = allowAdmin
    ? allowedScopes
    : allowedScopes.filter((s: ApiScope) => s !== "admin");

  if (scopes.length === 0) {
    return NextResponse.json({ error: "At least one scope required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("api_key_grants")
    .upsert(
      {
        user_id: userId,
        granted_by: auth.user.id,
        allowed_scopes: scopes,
        max_rate_limit_per_minute: maxRate,
        allow_admin_scope: allowAdmin,
        note,
        revoked_at: null,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ grant: data }, { status: 201 });
}
