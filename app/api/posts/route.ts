import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
    }

    const { title, content, tags } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: "Заголовок і контент обов'язкові" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role || "shemetovany";

    let status = "approved";

    if (role === "shemetovany") {
      const { count } = await admin
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("author_id", user.id)
        .eq("status", "pending");

      if ((count || 0) >= 3) {
        return NextResponse.json({ error: "Вже є 3 пости на розгляді." }, { status: 429 });
      }
      status = "pending";
    }

    const { data, error } = await admin.from("posts").insert({
      author_id: user.id,
      title,
      content,
      tags: Array.isArray(tags) ? tags : [],
      type: "blog",
      status,
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (status === "pending") {
      const { data: admins } = await admin
        .from("profiles")
        .select("id")
        .in("role", ["owner", "podrofikovany"]);

      if (admins) {
        for (const a of admins) {
          await admin.from("notifications").insert({
            user_id: a.id,
            type: "system",
            title: "Новий пост на розгляд",
            message: `Шеметований подав пост "${title}" на апрув`,
            link: "/admin",
          });
        }
      }
    }

    logActivity(user.id, "post_created", "post", data.id, { title, status });

    return NextResponse.json({ success: true, post: data, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}