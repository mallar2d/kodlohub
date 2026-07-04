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

  const projectUpdateMatch = path.match(/^\/projects\/([^/]+)\/updates\/([^/]+)$/);
  if (projectUpdateMatch) {
    const { data } = await admin
      .from("project_center_updates")
      .select("slug, title, summary, body_markdown, cover_image_url, project_center_projects(slug, title, short_description, cover_image_url, social_image_url, visibility, approval_status)")
      .eq("slug", projectUpdateMatch[2])
      .eq("status", "published")
      .maybeSingle();
    const project = Array.isArray(data?.project_center_projects)
      ? data?.project_center_projects[0]
      : data?.project_center_projects;
    if (data && project?.slug === projectUpdateMatch[1] && project.approval_status === "approved" && ["published", "unlisted", "archived"].includes(project.visibility)) {
      return apiJson(request, {
        og: {
          title: data.title,
          description: data.summary || data.body_markdown.slice(0, 200),
          image: data.cover_image_url || project.social_image_url || project.cover_image_url,
          url: `${base}/projects/${project.slug}/updates/${data.slug}`,
          type: "article",
        },
      });
    }
  }

  const projectMatch = path.match(/^\/projects\/([^/]+)$/);
  if (projectMatch) {
    const { data } = await admin
      .from("project_center_projects")
      .select("slug, title, short_description, cover_image_url, hero_image_url, social_image_url, visibility, approval_status")
      .eq("slug", projectMatch[1])
      .in("visibility", ["published", "unlisted", "archived"])
      .eq("approval_status", "approved")
      .maybeSingle();
    if (data) {
      return apiJson(request, {
        og: {
          title: data.title,
          description: data.short_description,
          image: data.social_image_url || data.hero_image_url || data.cover_image_url,
          url: `${base}/projects/${data.slug}`,
          type: "website",
        },
      });
    }
  }

  return apiError(request, "No OG data found for this URL", 404, "not_found");
});

export const OPTIONS = GET;
