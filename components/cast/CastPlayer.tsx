"use client";

import { useState, useRef, useEffect, useCallback } from "react";

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CastPlayer({
  audioUrl,
  backgroundTrackUrl,
  initialBackgroundVolume = 0.3,
}: {
  audioUrl: string;
  backgroundTrackUrl: string;
  initialBackgroundVolume?: number;
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bgVolume, setBgVolume] = useState(initialBackgroundVolume);
  const [bgMuted, setBgMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loaded, setLoaded] = useState(false);

  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const bgRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const voice = new Audio(audioUrl);
    voice.preload = "auto";
    voiceRef.current = voice;

    if (backgroundTrackUrl) {
      const bg = new Audio(backgroundTrackUrl);
      bg.loop = true;
      bg.volume = bgMuted ? 0 : bgVolume;
      bg.preload = "metadata";
      bgRef.current = bg;
    }

    voice.addEventListener("loadedmetadata", () => {
      setDuration(voice.duration);
      setLoaded(true);
    });

    voice.addEventListener("ended", () => {
      setPlaying(false);
      bgRef.current?.pause();
    });

    voice.addEventListener("play", () => {
      bgRef.current?.play().catch(() => {});
    });

    voice.addEventListener("pause", () => {
      bgRef.current?.pause();
    });

    return () => {
      voice.pause();
      voice.src = "";
      if (bgRef.current) {
        bgRef.current.pause();
        bgRef.current.src = "";
      }
    };
  }, [audioUrl, backgroundTrackUrl]);

  const updateProgress = useCallback(() => {
    if (voiceRef.current) {
      setProgress(voiceRef.current.currentTime);
    }
    rafRef.current = requestAnimationFrame(updateProgress);
  }, []);

  useEffect(() => {
    if (playing) {
      rafRef.current = requestAnimationFrame(updateProgress);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, updateProgress]);

  const togglePlay = () => {
    const voice = voiceRef.current;
    if (!voice) return;

    if (playing) {
      voice.pause();
    } else {
      voice.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const voice = voiceRef.current;
    if (!voice || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const newTime = percent * duration;
    voice.currentTime = newTime;
    setProgress(newTime);
  };

  const handleBgVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setBgVolume(vol);
    setBgMuted(false);
    if (bgRef.current) {
      bgRef.current.volume = vol;
      bgRef.current.muted = false;
    }
  };

  const toggleBgMute = () => {
    const newMuted = !bgMuted;
    setBgMuted(newMuted);
    if (bgRef.current) {
      bgRef.current.muted = newMuted;
    }
  };

  const changeRate = (rate: number) => {
    setPlaybackRate(rate);
    if (voiceRef.current) {
      voiceRef.current.playbackRate = rate;
    }
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="card-dark p-6">
      {/* Main progress bar */}
      <div className="mb-4">
        <div
          className="h-2 bg-canvas-night-soft rounded-full overflow-hidden cursor-pointer group"
          onClick={seek}
        >
          <div
            className="h-full bg-on-primary rounded-full transition-all group-hover:bg-on-primary-mute"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-ink-mute">{formatTime(progress)}</span>
          <span className="text-xs text-ink-mute">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-4 mb-4">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          disabled={!loaded}
          className="w-12 h-12 rounded-full border-2 border-on-primary flex items-center justify-center text-on-primary hover:bg-on-primary hover:text-canvas-night transition-colors disabled:opacity-30"
        >
          {playing ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          )}
        </button>

        {/* Speed controls */}
        <div className="flex items-center gap-1">
          {[1, 1.5, 2].map((rate) => (
            <button
              key={rate}
              onClick={() => changeRate(rate)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                playbackRate === rate
                  ? "bg-on-primary/10 text-on-primary"
                  : "text-ink-mute hover:text-on-primary"
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {!loaded && (
          <div className="animate-spin w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full" />
        )}
      </div>

      {/* Volume controls */}
      {backgroundTrackUrl && (
        <div className="border-t border-hairline-dark pt-4 space-y-3">
          {/* Voice volume */}
          <div className="flex items-center gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-mute shrink-0">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            <span className="text-xs text-ink-mute w-16 shrink-0">Голос</span>
            <div className="flex-1 h-1 bg-canvas-night-soft rounded-full">
              <div className="h-full bg-on-primary-mute rounded-full" style={{ width: "100%" }} />
            </div>
          </div>

          {/* Background track volume */}
          <div className="flex items-center gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-mute shrink-0">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
            <span className="text-xs text-ink-mute w-16 shrink-0">Фон</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={bgMuted ? 0 : bgVolume}
              onChange={handleBgVolumeChange}
              className="flex-1 h-1 appearance-none bg-canvas-night-soft rounded-full cursor-pointer accent-on-primary"
            />
            <button
              onClick={toggleBgMute}
              className="text-ink-mute hover:text-on-primary transition-colors shrink-0"
            >
              {bgMuted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <line x1="23" y1="9" x2="17" y2="15"/>
                  <line x1="17" y1="9" x2="23" y2="15"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
