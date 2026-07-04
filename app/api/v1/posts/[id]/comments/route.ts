import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth, requireServiceUser } from "@/lib/api/auth";
import { logActivity } from "@/lib/activity";
import { dispatchWebhook } from "@/lib/api/webhooks";
import { mapProfile } from "@/lib/api/helpers";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request, _ctx, routeCtx) => {
  const { id } = await routeCtx!.params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("comments")
    .select("id, content, created_at, author_id, profiles(display_name, username, avatar_url)")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  if (error) return apiError(request, error.message, 500);

  return apiJson(request, { comments: (data || []).map(mapProfile) });
});

export const POST = withApiAuth(
  async (request, ctx, routeCtx) => {
    const { id: postId } = await routeCtx!.params;
    const userCheck = requireServiceUser(request, ctx);
    if ("error" in userCheck) return userCheck.error;

    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) return apiError(request, "content is required", 400);

    const admin = createAdminClient();
    const { data: post } = await admin.from("posts").select("id, title, author_id").eq("id", postId).maybeSingle();
    if (!post) return apiError(request, "Post not found", 404, "not_found");

    const { data, error } = await admin
      .from("comments")
      .insert({ post_id: postId, author_id: userCheck.userId, content })
      .select("*, profiles(display_name, username, avatar_url)")
      .single();

    if (error) return apiError(request, error.message, 500);

    logActivity(userCheck.userId, "comment_created", "comment", data.id, { postId, via: "api" });
    void dispatchWebhook("comment.created", { comment: mapProfile(data), postId });

    return apiJson(request, { comment: mapProfile(data) }, 201);
  },
  { scopes: ["write"] }
);

export const OPTIONS = GET;
