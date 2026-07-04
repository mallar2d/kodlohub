import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

type ProjectUpdateSitemapRow = {
  slug: string;
  published_at: string | null;
  project_center_projects:
    | { slug: string; visibility: string }
    | Array<{ slug: string; visibility: string }>
    | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kodlo.host";

  const staticPages = ["", "/projects", "/projects/updates", "/blog", "/gallery", "/lore", "/tools", "/users", "/developers", "/docs"].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  try {
    const supabase = createAdminClient();

    // Fetch dynamic routes
    const [postsRes, loreRes, profilesRes, projectsRes, updatesRes] = await Promise.all([
      supabase.from("posts").select("id, created_at").eq("status", "approved"),
      supabase.from("lore_items").select("id, created_at"),
      supabase.from("profiles").select("id, created_at"),
      supabase.from("project_center_projects").select("slug, updated_at, visibility").in("visibility", ["published", "unlisted", "archived"]),
      supabase
        .from("project_center_updates")
        .select("slug, published_at, project_center_projects(slug, visibility)")
        .eq("status", "published"),
    ]);

    const postRoutes = (postsRes.data || []).map((post) => ({
      url: `${baseUrl}/blog/${post.id}`,
      lastModified: new Date(post.created_at || new Date()),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    const loreRoutes = (loreRes.data || []).map((item) => ({
      url: `${baseUrl}/lore/${item.id}`,
      lastModified: new Date(item.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    const profileRoutes = (profilesRes.data || []).map((profile) => ({
      url: `${baseUrl}/profile/${profile.id}`,
      lastModified: new Date(profile.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));

    const projectRoutes = (projectsRes.data || []).map((project) => ({
      url: `${baseUrl}/projects/${project.slug}`,
      lastModified: new Date(project.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    const updateRoutes = ((updatesRes.data || []) as ProjectUpdateSitemapRow[])
      .map((update) => {
        const project = Array.isArray(update.project_center_projects)
          ? update.project_center_projects[0]
          : update.project_center_projects;
        if (!project || !["published", "unlisted", "archived"].includes(project.visibility)) return null;
        return {
          url: `${baseUrl}/projects/${project.slug}/updates/${update.slug}`,
          lastModified: new Date(update.published_at || new Date()),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        };
      })
      .filter(Boolean) as MetadataRoute.Sitemap;

    return [...staticPages, ...projectRoutes, ...updateRoutes, ...postRoutes, ...loreRoutes, ...profileRoutes];
  } catch (e) {
    console.error("Sitemap generation error:", e);
    return staticPages;
  }
}
