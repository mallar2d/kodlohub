import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { dispatchWebhook } from "@/lib/api/webhooks";
import { apiError, apiJson } from "@/lib/api/response";

export const PATCH = withApiAuth(
  async (request, _ctx, routeCtx) => {
    const { id } = await routeCtx!.params;
    const body = await request.json();
    const status = body.status;

    if (status !== "approved" && status !== "rejected") {
      return apiError(request, "status must be approved or rejected", 400);
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("posts")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) return apiError(request, error.message, 500);

    if (status === "approved") {
      void dispatchWebhook("post.approved", { post: data });
      if (data.author_id) {
        await admin.from("notifications").insert({
          user_id: data.author_id,
          type: "post_approved",
          title: "Пост схвалено",
          message: `Твій пост "${data.title}" опубліковано`,
          link: `/blog/${data.id}`,
        });
      }
    } else if (data.author_id) {
      await admin.from("notifications").insert({
        user_id: data.author_id,
        type: "post_rejected",
        title: "Пост відхилено",
        message: `Твій пост "${data.title}" не пройшов модерацію`,
      });
    }

    return apiJson(request, { post: data });
  },
  { scopes: ["admin"] }
);

export const OPTIONS = PATCH;
