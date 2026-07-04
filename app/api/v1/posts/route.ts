import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth, requireServiceUser } from "@/lib/api/auth";
import { logActivity } from "@/lib/activity";
import { dispatchWebhook } from "@/lib/api/webhooks";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const tag = searchParams.get("tag");

  const supabase = createAdminClient();

  let query = supabase
    .from("posts")
    .select("id, title, content, tags, status, created_at, updated_at, profiles(display_name, username, avatar_url)", {
      count: "exact",
    })
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  const { data, error, count } = await query;

  if (error) {
    return apiError(request, error.message, 500);
  }

  const posts = (data || []).map((p) => ({
    ...p,
    profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles || null,
  }));

  return apiJson(request, {
    posts,
    pagination: { limit, offset, total: count ?? posts.length },
  });
});

export const POST = withApiAuth(
  async (request, ctx) => {
    const userCheck = requireServiceUser(request, ctx);
    if ("error" in userCheck) return userCheck.error;

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const tags = Array.isArray(body.tags) ? body.tags : [];
    const autoApprove = body.auto_approve === true && ctx.scopes.includes("admin");

    if (!title || !content) {
      return apiError(request, "title and content are required", 400);
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userCheck.userId)
      .maybeSingle();

    const role = profile?.role || "shemetovany";
    let status = autoApprove || role !== "shemetovany" ? "approved" : "pending";

    if (status === "pending") {
      const { count } = await admin
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("author_id", userCheck.userId)
        .eq("status", "pending");
      if ((count || 0) >= 3) {
        return apiError(request, "Too many pending posts", 429, "rate_limit");
      }
    }

    const { data, error } = await admin
      .from("posts")
      .insert({
        author_id: userCheck.userId,
        title,
        content,
        tags,
        type: "blog",
        status,
      })
      .select()
      .single();

    if (error) return apiError(request, error.message, 500);

    logActivity(userCheck.userId, "post_created", "post", data.id, { title, status, via: "api" });
    void dispatchWebhook("post.created", { post: data });

    if (status === "approved") {
      void dispatchWebhook("post.approved", { post: data });
    }

    return apiJson(request, { post: data, status }, 201);
  },
  { scopes: ["write"] }
);

export const OPTIONS = GET;
