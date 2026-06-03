import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import CastEpisodeClient from "./CastEpisodeClient";
import type { Metadata } from "next";
import Link from "next/link";

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

interface PodcastSettings {
  background_track_url: string;
  background_volume: number;
}

async function getEpisode(id: string): Promise<PodcastEpisode | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("podcast_episodes")
    .select("*, profiles(display_name, username, avatar_url)")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (!data) return null;

  return {
    ...data,
    profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles || null,
  } as PodcastEpisode;
}

async function getSettings(): Promise<PodcastSettings> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("podcast_settings")
    .select("background_track_url, background_volume")
    .eq("id", 1)
    .single();
  return data || { background_track_url: "", background_volume: 0.3 };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const episode = await getEpisode(id);

  if (!episode) {
    return { title: "Випуск не знайдено" };
  }

  return {
    title: `Випуск #${episode.episode_number}: ${episode.title} — КодлоCAST`,
    description: episode.description || `Випуск #${episode.episode_number} подкасту КодлоCAST`,
  };
}

export default async function CastEpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [episode, settings] = await Promise.all([getEpisode(id), getSettings()]);

  if (!episode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="heading-sub text-hairline-dark mb-4">:(</p>
          <p className="text-on-primary-mute">Випуск не знайдено</p>
          <Link href="/cast" className="btn-ghost text-on-primary text-xs mt-6 inline-block">
            НАЗАД ДО КАСТІВ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <CastEpisodeClient episode={episode} settings={settings} />
  );
}
