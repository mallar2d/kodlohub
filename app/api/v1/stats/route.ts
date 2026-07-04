import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request) => {
  const admin = createAdminClient();

  const [profiles, posts, media, lore, wiki, episodes] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("posts").select("id", { count: "exact", head: true }).eq("status", "approved"),
    admin.from("media").select("id", { count: "exact", head: true }),
    admin.from("lore_items").select("id", { count: "exact", head: true }),
    admin.from("wiki_articles").select("id", { count: "exact", head: true }).eq("is_published", true),
    admin.from("podcast_episodes").select("id", { count: "exact", head: true }).eq("is_published", true),
  ]);

  if (profiles.error) return apiError(request, profiles.error.message, 500);

  return apiJson(request, {
    stats: {
      profiles: profiles.count ?? 0,
      posts: posts.count ?? 0,
      media: media.count ?? 0,
      lore: lore.count ?? 0,
      wikiArticles: wiki.count ?? 0,
      podcastEpisodes: episodes.count ?? 0,
    },
  });
});

export const OPTIONS = GET;
