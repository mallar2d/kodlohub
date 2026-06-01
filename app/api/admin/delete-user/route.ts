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

    const { userId: targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: "Не вказано ID користувача" }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ error: "Не можна видалити самого себе" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Get requester profile role
    const { data: requesterProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const requesterRole = requesterProfile?.role || "shemetovany";

    if (requesterRole !== "owner" && requesterRole !== "podrofikovany") {
      return NextResponse.json({ error: "Немає прав для видалення користувачів" }, { status: 403 });
    }

    // 2. Get target user profile role
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("role, display_name")
      .eq("id", targetUserId)
      .maybeSingle();

    if (!targetProfile) {
      return NextResponse.json({ error: "Користувача не знайдено" }, { status: 404 });
    }

    const targetRole = targetProfile.role;

    // Check if requester has authority over target
    let hasAuthority = false;
    if (requesterRole === "owner") {
      hasAuthority = true;
    } else if (requesterRole === "podrofikovany") {
      // Podrofikovany can only delete kodlo or shemetovany
      hasAuthority = targetRole === "kodlo" || targetRole === "shemetovany";
    }

    if (!hasAuthority) {
      return NextResponse.json({ error: "Недостатньо прав для видалення цього користувача" }, { status: 403 });
    }

    // 3. Delete user in auth and profile
    const { error: authError } = await admin.auth.admin.deleteUser(targetUserId);
    if (authError) {
      return NextResponse.json({ error: `Помилка видалення auth: ${authError.message}` }, { status: 500 });
    }

    const { error: profileError } = await admin.from("profiles").delete().eq("id", targetUserId);
    if (profileError) {
      return NextResponse.json({ error: `Помилка видалення профілю: ${profileError.message}` }, { status: 500 });
    }

    logActivity(user.id, "user_deleted", "profile", targetUserId, {
      displayName: targetProfile.display_name,
      role: targetRole,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
