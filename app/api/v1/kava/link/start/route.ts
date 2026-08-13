import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Check if user already has a pending non-expired token
    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const { error: insertErr } = await admin.from("telegram_link_tokens").insert({
      token,
      user_id: user.id,
      expires_at: expiresAt.toISOString(),
      used: false,
    });

    if (insertErr) {
      console.error("Error creating link token:", insertErr);
      return NextResponse.json(
        { error: "Помилка генерації токена прив'язки" },
        { status: 500 }
      );
    }

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "podroid_bot";
    const linkUrl = `https://t.me/${botUsername}?start=link_${token}`;

    return NextResponse.json({
      success: true,
      token,
      link_url: linkUrl,
      expires_at: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Link start error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
