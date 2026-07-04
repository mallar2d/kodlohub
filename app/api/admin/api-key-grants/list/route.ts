import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const auth = await requireOwner();
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("api_key_grants")
    .select("user_id, granted_by, allowed_scopes, max_rate_limit_per_minute, allow_admin_scope, note, created_at, revoked_at, profiles!api_key_grants_user_id_fkey(display_name, username, avatar_url)")
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const grants = (data || []).map((g) => ({
    ...g,
    profiles: Array.isArray(g.profiles) ? g.profiles[0] : g.profiles || null,
  }));

  return NextResponse.json({ grants });
}
