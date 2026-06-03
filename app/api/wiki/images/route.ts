import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "50");

    const supabase = createAdminClient();

    let query = supabase
      .from("media")
      .select("id, file_url, file_type, caption, created_at")
      .in("file_type", ["image", "image/jpeg", "image/png", "image/gif", "image/webp"])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (q) {
      query = query.ilike("caption", `%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ images: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
