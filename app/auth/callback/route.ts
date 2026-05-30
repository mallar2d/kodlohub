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

      await admin.from("profiles").upsert(
        {
          id: u.id,
          username: meta.email?.split("@")[0] || u.email?.split("@")[0] || `user_${u.id.slice(0, 8)}`,
          display_name: meta.full_name || meta.name || u.email?.split("@")[0] || "Учасник кодла",
          avatar_url: meta.avatar_url || meta.picture || null,
          bio: "",
        },
        { onConflict: "id" }
      );

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
