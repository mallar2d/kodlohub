"use client";

import Link from "next/link";
import CastPlayer from "@/components/cast/CastPlayer";

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

export default function CastEpisodeClient({
  episode,
  settings,
}: {
  episode: PodcastEpisode;
  settings: PodcastSettings;
}) {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[800px] mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-8">
          <Link href="/cast" className="micro-cap text-ink-mute hover:text-on-primary transition-colors">
            КОДЛОКАСТ
          </Link>
          <span className="text-ink-mute">/</span>
          <span className="micro-cap text-on-primary">
            ВИПУСК #{episode.episode_number}
          </span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="button-cap px-3 py-1 rounded-full border border-hairline-dark text-on-primary-mute text-[10px]">
              ВИПУСК #{episode.episode_number}
            </span>
            <span className="caption text-ink-mute">
              {new Date(episode.created_at).toLocaleDateString("uk-UA")}
            </span>
          </div>
          <h1 className="heading-sub mb-4">{episode.title}</h1>
          {episode.profiles && (
            <p className="caption text-ink-mute">
              {episode.profiles.display_name}
            </p>
          )}
        </div>

        {/* Player */}
        <CastPlayer
          audioUrl={episode.audio_url}
          backgroundTrackUrl={settings.background_track_url}
          initialBackgroundVolume={settings.background_volume}
        />

        {/* Description */}
        {episode.description && (
          <div className="mt-8">
            <h2 className="micro-cap text-ink-mute mb-4">ПРО ВИПУСК</h2>
            <p className="text-on-primary-mute leading-relaxed whitespace-pre-wrap">
              {episode.description}
            </p>
          </div>
        )}

        {/* Back link */}
        <div className="mt-12">
          <Link href="/cast" className="micro-cap text-ink-mute hover:text-on-primary transition-colors">
            ← НАЗАД ДО КАСТІВ
          </Link>
        </div>
      </div>
    </div>
  );
}
