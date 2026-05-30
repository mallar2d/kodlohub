import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const admin = createAdminClient();
      const u = data.user;
      const meta = u.user_metadata || {};

      // Check if profile already exists
      const { data: existing } = await admin
        .from("profiles")
        .select("id, role")
        .eq("id", u.id)
        .single();

      // Determine role
      let role = "shemetovany";
      if (existing) {
        // Keep existing role on re-login
        role = existing.role;
      } else {
        // First user becomes owner
        const { count } = await admin
          .from("profiles")
          .select("id", { count: "exact", head: true });
        if (count === 0) role = "owner";
      }

      await admin.from("profiles").upsert(
        {
          id: u.id,
          username: meta.email?.split("@")[0] || u.email?.split("@")[0] || `user_${u.id.slice(0, 8)}`,
          display_name: meta.full_name || meta.name || u.email?.split("@")[0] || "Учасник кодла",
          avatar_url: meta.avatar_url || meta.picture || null,
          bio: "",
          role,
        },
        { onConflict: "id" }
      );

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
