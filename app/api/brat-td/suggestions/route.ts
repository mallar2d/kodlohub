import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { VALID_SUGGESTION_TAG_IDS } from "@/lib/brat-td/suggestion-tags";
import { NextResponse } from "next/server";

const MAX_DESCRIPTION_LENGTH = 2000;
const MIN_DESCRIPTION_LENGTH = 10;
const MAX_TAGS = 5;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Увійди, щоб надіслати пропозицію" }, { status: 401 });
    }

    const body = await request.json();
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const tags: string[] = Array.isArray(body.tags)
      ? body.tags.filter((tag: unknown): tag is string => typeof tag === "string")
      : [];

    if (description.length < MIN_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Опис має бути щонайменше ${MIN_DESCRIPTION_LENGTH} символів` },
        { status: 400 },
      );
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Опис не може перевищувати ${MAX_DESCRIPTION_LENGTH} символів` },
        { status: 400 },
      );
    }

    const uniqueTags = [...new Set(tags)];

    if (uniqueTags.length === 0) {
      return NextResponse.json({ error: "Обери хоча б один тег" }, { status: 400 });
    }

    if (uniqueTags.length > MAX_TAGS) {
      return NextResponse.json({ error: `Максимум ${MAX_TAGS} тегів` }, { status: 400 });
    }

    if (!uniqueTags.every((tag) => VALID_SUGGESTION_TAG_IDS.has(tag))) {
      return NextResponse.json({ error: "Невідомий тег" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { error } = await admin.from("brat_td_suggestions").insert({
      user_id: user.id,
      description,
      tags: uniqueTags,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: owners } = await admin.from("profiles").select("id").eq("role", "owner");

    if (owners) {
      for (const owner of owners) {
        await admin.from("notifications").insert({
          user_id: owner.id,
          type: "system",
          title: "Нова пропозиція для Brat TD",
          message: "Хтось запропонував оновлення або ідею для Brat TD",
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
