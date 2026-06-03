"use client";

import { useState } from "react";
import Link from "next/link";
import EpisodeCard from "@/components/cast/EpisodeCard";
import EmptyState from "@/components/ui/EmptyState";

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

export default function CastClient({
  episodes,
  settings,
}: {
  episodes: PodcastEpisode[];
  settings: PodcastSettings;
}) {
  const [userRole, setUserRole] = useState<string | null>(null);

  if (typeof window !== "undefined") {
    const role = localStorage.getItem("userRole");
    if (role && role !== userRole) setUserRole(role);
  }

  const isAdmin = userRole === "owner" || userRole === "podrofikovany";

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-12 flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="micro-cap text-ink-mute mb-2">СЛУХАЙ КОДЛО</p>
            <h1 className="heading-section mb-4">КОДЛОКАСТ</h1>
            <p className="text-on-primary-mute text-lg max-w-2xl">
              Подкаст кодла. Голоси, історії та балачки без зайвого. Просто увімкни і слухай.
            </p>
          </div>
          {isAdmin && (
            <Link href="/cast/new" className="btn-ghost text-on-primary text-xs">
              + НОВИЙ ВИПУСК
            </Link>
          )}
        </div>

        {episodes.length === 0 ? (
          <EmptyState message="випусків поки немає" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {episodes.map((episode) => (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                backgroundTrackUrl={settings.background_track_url}
                backgroundVolume={settings.background_volume}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
