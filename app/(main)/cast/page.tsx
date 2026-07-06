import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import CastClient from "./CastClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "КодлоCAST",
  description: "Подкаст кодла. Голоси, історії та балачки без зайвого.",
  path: "/cast",
});

interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  duration: number;
  episode_number: number;
  created_at: string;
  profiles?: { display_name: string; username: string; avatar_url: string | null } | null;
}

const getEpisodes = unstable_cache(
  async (): Promise<PodcastEpisode[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("podcast_episodes")
      .select("*, profiles(display_name, username, avatar_url)")
      .eq("is_published", true)
      .order("episode_number", { ascending: false });
    return (data || []).map((e: any) => ({
      ...e,
      profiles: Array.isArray(e.profiles) ? e.profiles[0] : e.profiles || null,
    })) as PodcastEpisode[];
  },
  ["podcast-episodes"],
  { revalidate: 30 }
);

const getSettings = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("podcast_settings")
      .select("background_track_url, background_volume")
      .eq("id", 1)
      .single();
    return data || { background_track_url: "", background_volume: 0.3 };
  },
  ["podcast-settings"],
  { revalidate: 300 }
);

export default async function CastPage() {
  const [episodes, settings] = await Promise.all([getEpisodes(), getSettings()]);

  return (
    <CastClient episodes={episodes} settings={settings} />
  );
}
