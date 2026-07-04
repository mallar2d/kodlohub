import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { createNotification } from "@/lib/notifications";
import { apiError, apiJson } from "@/lib/api/response";

export const POST = withApiAuth(
  async (request) => {
    const body = await request.json();
    const userId = typeof body.user_id === "string" ? body.user_id : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const link = typeof body.link === "string" ? body.link : undefined;
    const type = body.type || "system";

    if (!userId || !title || !message) {
      return apiError(request, "user_id, title and message are required", 400);
    }

    const validTypes = ["comment", "post_approved", "post_rejected", "role_changed", "post_deleted", "system"];
    if (!validTypes.includes(type)) {
      return apiError(request, "Invalid notification type", 400);
    }

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (!profile) return apiError(request, "User not found", 404, "not_found");

    await createNotification({ userId, type, title, message, link });

    return apiJson(request, { success: true }, 201);
  },
  { scopes: ["write"] }
);

export const OPTIONS = POST;
