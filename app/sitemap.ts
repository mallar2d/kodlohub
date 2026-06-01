import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kodlo.host";

  const staticPages = ["", "/blog", "/gallery", "/lore", "/tools", "/users"].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  try {
    const supabase = createAdminClient();

    // Fetch dynamic routes
    const [postsRes, loreRes, profilesRes] = await Promise.all([
      supabase.from("posts").select("id, created_at").eq("status", "approved"),
      supabase.from("lore_items").select("id, created_at"),
      supabase.from("profiles").select("id, created_at"),
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

    return [...staticPages, ...postRoutes, ...loreRoutes, ...profileRoutes];
  } catch (e) {
    console.error("Sitemap generation error:", e);
    return staticPages;
  }
}
