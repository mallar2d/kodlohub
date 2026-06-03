"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

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

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function EpisodeCard({
  episode,
  backgroundTrackUrl,
  backgroundVolume,
}: {
  episode: PodcastEpisode;
  backgroundTrackUrl: string;
  backgroundVolume: number;
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const bgRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    voiceRef.current = new Audio(episode.audio_url);
    voiceRef.current.preload = "metadata";
    if (backgroundTrackUrl) {
      bgRef.current = new Audio(backgroundTrackUrl);
      bgRef.current.loop = true;
      bgRef.current.volume = backgroundVolume;
      bgRef.current.preload = "metadata";
    }

    voiceRef.current.addEventListener("loadedmetadata", () => {
      setDuration(voiceRef.current?.duration || 0);
    });

    voiceRef.current.addEventListener("timeupdate", () => {
      setProgress(voiceRef.current?.currentTime || 0);
    });

    voiceRef.current.addEventListener("ended", () => {
      setPlaying(false);
      bgRef.current?.pause();
    });

    return () => {
      voiceRef.current?.pause();
      bgRef.current?.pause();
    };
  }, [episode.audio_url, backgroundTrackUrl, backgroundVolume]);

  const togglePlay = () => {
    const voice = voiceRef.current;
    const bg = bgRef.current;
    if (!voice) return;

    if (playing) {
      voice.pause();
      bg?.pause();
    } else {
      voice.play().catch(() => {});
      bg?.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  return (
    <div className="card-dark p-6 hover:border-on-primary-mute transition-colors group">
      <div className="flex items-center gap-2 mb-3">
        <span className="button-cap px-3 py-1 rounded-full border border-hairline-dark text-on-primary-mute text-[10px]">
          ВИПУСК #{episode.episode_number}
        </span>
        <span className="caption text-ink-mute">
          {new Date(episode.created_at).toLocaleDateString("uk-UA")}
        </span>
        {duration > 0 && (
          <span className="caption text-ink-mute">
            · {formatDuration(duration)}
          </span>
        )}
      </div>

      <Link href={`/cast/${episode.id}`}>
        <h3 className="heading-sub text-on-primary mb-3 group-hover:text-on-primary-mute transition-colors line-clamp-2 text-xl">
          {episode.title}
        </h3>
      </Link>

      {episode.description && (
        <p className="text-on-primary-mute text-sm line-clamp-2 mb-4">
          {episode.description}
        </p>
      )}

      {/* Mini player */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full border border-hairline-dark flex items-center justify-center text-on-primary hover:bg-canvas-night-soft transition-colors shrink-0"
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="h-1 bg-canvas-night-soft rounded-full overflow-hidden">
            <div
              className="h-full bg-on-primary-mute rounded-full transition-all"
              style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : "0%" }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-ink-mute">{formatDuration(progress)}</span>
            <span className="text-[10px] text-ink-mute">{formatDuration(duration)}</span>
          </div>
        </div>
      </div>

      {episode.profiles && (
        <p className="caption text-ink-mute mt-3">
          {episode.profiles.display_name}
        </p>
      )}
    </div>
  );
}
