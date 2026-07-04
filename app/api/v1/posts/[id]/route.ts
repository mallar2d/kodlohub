import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth, requireServiceUser } from "@/lib/api/auth";
import { logActivity } from "@/lib/activity";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request, _ctx, routeCtx) => {
  const { id } = await routeCtx!.params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("posts")
    .select("id, title, content, tags, status, created_at, updated_at, profiles(display_name, username, avatar_url, role)")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();

  if (error) {
    return apiError(request, error.message, 500);
  }

  if (!data) {
    return apiError(request, "Post not found", 404, "not_found");
  }

  return apiJson(request, {
    post: {
      ...data,
      profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles || null,
    },
  });
});

export const PATCH = withApiAuth(
  async (request, ctx, routeCtx) => {
    const { id } = await routeCtx!.params;
    const userCheck = requireServiceUser(request, ctx);
    if ("error" in userCheck) return userCheck.error;

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (typeof body.title === "string" && body.title.trim()) updates.title = body.title.trim();
    if (typeof body.content === "string" && body.content.trim()) updates.content = body.content.trim();
    if (Array.isArray(body.tags)) updates.tags = body.tags;

    if (Object.keys(updates).length === 0) {
      return apiError(request, "Provide at least one of: title, content, tags", 400);
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("posts")
      .select("id, author_id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) return apiError(request, "Post not found", 404, "not_found");
    if (existing.author_id !== userCheck.userId) {
      return apiError(request, "You can only edit posts authored by the key's service user", 403, "forbidden");
    }

    const { data, error } = await admin
      .from("posts")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return apiError(request, error.message, 500);

    logActivity(userCheck.userId, "post_updated", "post", id, { via: "api" });

    return apiJson(request, { post: data });
  },
  { scopes: ["write"] }
);

export const DELETE = withApiAuth(
  async (request, ctx, routeCtx) => {
    const { id } = await routeCtx!.params;
    const userCheck = requireServiceUser(request, ctx);
    if ("error" in userCheck) return userCheck.error;

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("posts")
      .select("id, author_id, title")
      .eq("id", id)
      .maybeSingle();

    if (!existing) return apiError(request, "Post not found", 404, "not_found");
    if (existing.author_id !== userCheck.userId) {
      return apiError(request, "You can only delete posts authored by the key's service user", 403, "forbidden");
    }

    const { error } = await admin.from("posts").delete().eq("id", id);
    if (error) return apiError(request, error.message, 500);

    logActivity(userCheck.userId, "post_deleted", "post", id, { title: existing.title, via: "api" });

    return apiJson(request, { success: true });
  },
  { scopes: ["write"] }
);

export const OPTIONS = GET;
