import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { itemType, itemId } = await request.json();

    if (!itemType || !itemId) {
      return NextResponse.json({ error: "Missing itemType or itemId" }, { status: 400 });
    }

    if (!["post", "media", "lore"].includes(itemType)) {
      return NextResponse.json({ error: "Invalid itemType" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = user.id;

    const { data: existing } = await supabase
      .from("likes")
      .select("id")
      .eq("user_id", userId)
      .eq("item_type", itemType)
      .eq("item_id", itemId)
      .single();

    if (existing) {
      await supabase.from("likes").delete().eq("id", existing.id);
      logActivity(userId, "like_removed", "like", undefined, { itemType, itemId });
      return NextResponse.json({ liked: false });
    } else {
      await supabase.from("likes").insert({
        user_id: userId,
        item_type: itemType,
        item_id: itemId,
      });
      logActivity(userId, "like_added", "like", undefined, { itemType, itemId });
      return NextResponse.json({ liked: true });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
