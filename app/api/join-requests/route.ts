import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
    }

    const { message } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Повідомлення обов'язкове" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("join_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Вже є заявка на розгляді. Чекай." }, { status: 409 });
    }

    const { error } = await admin.from("join_requests").insert({
      user_id: user.id,
      message: message.trim(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: admins } = await admin
      .from("profiles")
      .select("id")
      .in("role", ["owner", "podrofikovany"]);

    if (admins) {
      for (const a of admins) {
        await admin.from("notifications").insert({
          user_id: a.id,
          type: "system",
          title: "Заявка на Кодло",
          message: "Шеметований користувач подав заявку на перехід в Кодло",
          link: "/admin",
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}