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

      const { data: existing } = await admin
        .from("profiles")
        .select("id, role")
        .eq("id", u.id)
        .single();

      let role = "shemetovany";
      if (existing) {
        role = existing.role;
      } else {
        const { count } = await admin
          .from("profiles")
          .select("id", { count: "exact", head: true });
        if (count === 0) role = "owner";
      }

      const baseUsername =
        meta.email?.split("@")[0] ||
        u.email?.split("@")[0] ||
        `user_${u.id.slice(0, 8)}`;

      // Try upsert, handle username conflict with suffix
      let username = baseUsername;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { error: upsertErr } = await admin.from("profiles").upsert(
          {
            id: u.id,
            username,
            display_name:
              meta.full_name || meta.name || u.email?.split("@")[0] || "Учасник кодла",
            avatar_url: meta.avatar_url || meta.picture || null,
            bio: "",
            role,
          },
          { onConflict: "id" },
        );

        if (!upsertErr) break;

        if (
          upsertErr.code === "23505" &&
          upsertErr.message?.includes("username")
        ) {
          username = `${baseUsername}_${Math.floor(Math.random() * 9000 + 1000)}`;
          continue;
        }

        console.error("[auth/callback] profile upsert failed:", upsertErr);
        break;
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
