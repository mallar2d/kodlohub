import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  const body = await request.json();
  const { id, first_name, last_name, username, photo_url, auth_date, hash } =
    body;

  // Verify Telegram data
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN не налаштований" },
      { status: 500 }
    );
  }

  // Check hash
  const secret = crypto.createHash("sha256").update(botToken).digest();
  const checkString = [
    `auth_date=${auth_date}`,
    `first_name=${first_name || ""}`,
    `id=${id}`,
    last_name ? `last_name=${last_name}` : "",
    photo_url ? `photo_url=${photo_url}` : "",
    username ? `username=${username}` : "",
  ]
    .filter(Boolean)
    .sort()
    .join("\n");

  const hmac = crypto.createHmac("sha256", secret).update(checkString).digest("hex");

  if (hmac !== hash) {
    return NextResponse.json(
      { error: "Невірний хеш авторизації" },
      { status: 401 }
    );
  }

  // Check auth_date is not too old (5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (now - Number(auth_date) > 300) {
    return NextResponse.json(
      { error: "Час авторизації вичерпаний. Спробуй ще раз." },
      { status: 401 }
    );
  }

  const admin = createAdminClient();

  // Upsert profile
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: String(id),
      username: username || `user_${id}`,
      display_name: [first_name, last_name].filter(Boolean).join(" "),
      avatar_url: photo_url || null,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return NextResponse.json(
      { error: `Помилка профілю: ${profileError.message}` },
      { status: 500 }
    );
  }

  // Create Supabase user with email = tg_{id}@kodlohost.local
  const email = `tg_${id}@kodlohost.local`;
  const password = `tg_${id}_${process.env.TELEGRAM_BOT_TOKEN}`;

  // Try to sign in first
  const { data: signInData, error: signInError } = await admin.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    // User doesn't exist yet, create them
    const { data: userData, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          telegram_id: id,
          telegram_username: username,
          telegram_first_name: first_name,
          telegram_photo: photo_url,
        },
      });

    if (createError) {
      return NextResponse.json(
        { error: `Помилка створення користувача: ${createError.message}` },
        { status: 500 }
      );
    }

    // Now sign in
    const { data: retrySignIn, error: retryError } =
      await admin.auth.signInWithPassword({ email, password });

    if (retryError) {
      return NextResponse.json(
        { error: `Помилка входу: ${retryError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: retrySignIn.user,
      session: retrySignIn.session,
    });
  }

  return NextResponse.json({
    user: signInData.user,
    session: signInData.session,
  });
}
