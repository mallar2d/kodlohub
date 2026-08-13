import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import type { MediaItem, PostItem, LoreItem, PodcastEpisodeItem } from "@/components/archive/UnifiedArchiveClient";

export const getUnifiedArchiveData = unstable_cache(
  async (): Promise<{
    media: MediaItem[];
    posts: PostItem[];
    lore: LoreItem[];
    podcasts: PodcastEpisodeItem[];
  }> => {
    const supabase = createAdminClient();

    const [mediaRes, postsRes, loreRes, podcastsRes] = await Promise.all([
      supabase
        .from("media")
        .select("id, file_url, file_type, caption, created_at, author_id, profiles(display_name, username, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("posts")
        .select("id, title, content, tags, type, status, created_at, author_id, profiles(display_name, username, avatar_url)")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("lore_items")
        .select("*, media(id, file_url, file_type, caption), profiles(display_name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("podcast_episodes")
        .select("*, profiles(display_name, username, avatar_url)")
        .eq("is_published", true)
        .order("episode_number", { ascending: false }),
    ]);

    // Collect all media IDs that are already attached to lore items to prevent duplication
    const loreMediaIds = new Set<string>();
    for (const l of loreRes.data || []) {
      if (l.media_id) loreMediaIds.add(l.media_id);
    }

    // Filter out orphan/duplicate media entries that are already shown as lore artifacts
    const media = (mediaRes.data || [])
      .filter((item: any) => !loreMediaIds.has(item.id))
      .map((item: any) => ({
        ...item,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles || null,
      })) as MediaItem[];

    const posts = (postsRes.data || []).map((p: any) => ({
      ...p,
      profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles || null,
    })) as PostItem[];

    const lore = (loreRes.data || []).map((item: any) => ({
      ...item,
      media: Array.isArray(item.media) ? item.media[0] : item.media || null,
      profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles || null,
    })) as LoreItem[];

    const podcasts = (podcastsRes.data || []).map((item: any) => ({
      ...item,
      profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles || null,
    })) as PodcastEpisodeItem[];

    return { media, posts, lore, podcasts };
  },
  ["unified-archive-data-v6"],
  { revalidate: 30 }
);
