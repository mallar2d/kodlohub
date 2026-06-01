import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const meta = user.user_metadata || {};

    const { data: existing } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
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
      user.email?.split("@")[0] ||
      `user_${user.id.slice(0, 8)}`;

    let username = baseUsername;
    for (let attempt = 0; attempt < 5; attempt++) {
      const { error: upsertErr } = await admin.from("profiles").upsert(
        {
          id: user.id,
          username,
          display_name:
            meta.full_name || meta.name || user.email?.split("@")[0] || "Учасник кодла",
          avatar_url: meta.avatar_url || meta.picture || null,
          bio: "",
          role,
        },
        { onConflict: "id" },
      );

      if (!upsertErr) break;

      if (upsertErr.code === "23505" && upsertErr.message?.includes("username")) {
        username = `${baseUsername}_${Math.floor(Math.random() * 9000 + 1000)}`;
        continue;
      }

      console.error("[api/sync-profile] upsert failed:", upsertErr);
      break;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
