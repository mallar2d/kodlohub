import { createAdminClient } from "@/lib/supabase/admin";

type ActionType =
  | "post_created"
  | "post_updated"
  | "post_deleted"
  | "media_uploaded"
  | "media_deleted"
  | "comment_created"
  | "comment_deleted"
  | "lore_created"
  | "lore_deleted"
  | "role_changed"
  | "user_deleted"
  | "like_added"
  | "like_removed";

type EntityType = "post" | "media" | "comment" | "lore" | "profile" | "like";

export async function logActivity(
  userId: string,
  action: ActionType,
  entityType: EntityType,
  entityId?: string,
  details?: Record<string, unknown>,
) {
  try {
    const supabase = createAdminClient();
    await supabase.from("activity_log").insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || null,
    });
  } catch (err) {
    console.error("Activity log error:", err);
  }
}
