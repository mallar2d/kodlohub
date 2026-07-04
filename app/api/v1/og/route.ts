import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return apiError(request, "url query parameter is required", 400, "missing_url");
  }

  let path: string;
  try {
    const parsed = new URL(rawUrl, request.url);
    path = parsed.pathname;
  } catch {
    return apiError(request, "Invalid url", 400, "invalid_url");
  }

  const admin = createAdminClient();
  const base = new URL(request.url).origin;

  const blogMatch = path.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    const { data } = await admin
      .from("posts")
      .select("id, title, content, created_at")
      .eq("id", blogMatch[1])
      .eq("status", "approved")
      .maybeSingle();
    if (data) {
      return apiJson(request, {
        og: {
          title: data.title,
          description: data.content.slice(0, 200),
          url: `${base}/blog/${data.id}`,
          type: "article",
        },
      });
    }
  }

  const profileMatch = path.match(/^\/profile\/([^/]+)$/);
  if (profileMatch) {
    const { data } = await admin
      .from("profiles")
      .select("id, display_name, username, bio, avatar_url")
      .eq("id", profileMatch[1])
      .maybeSingle();
    if (data) {
      return apiJson(request, {
        og: {
          title: data.display_name || data.username,
          description: data.bio || `@${data.username}`,
          image: data.avatar_url,
          url: `${base}/profile/${data.id}`,
          type: "profile",
        },
      });
    }
  }

  const wikiMatch = path.match(/^\/wiki\/[^/]+\/([^/]+)$/);
  if (wikiMatch) {
    const { data } = await admin
      .from("wiki_articles")
      .select("slug, title, content")
      .eq("slug", wikiMatch[1])
      .eq("is_published", true)
      .maybeSingle();
    if (data) {
      return apiJson(request, {
        og: {
          title: data.title,
          description: data.content.slice(0, 200),
          url: rawUrl.startsWith("http") ? rawUrl : `${base}${path}`,
          type: "article",
        },
      });
    }
  }

  return apiError(request, "No OG data found for this URL", 404, "not_found");
});

export const OPTIONS = GET;
