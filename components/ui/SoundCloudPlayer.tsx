"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const PLAYLIST_URL =
  "https://soundcloud.com/zt-barista/sets/podro-greatest-hit-moj";
const WIDGET_SRC = `https://w.soundcloud.com/player/?url=${encodeURIComponent(PLAYLIST_URL)}&auto_play=false&show_artwork=false&show_comments=false&show_user=false&hide_related=true&color=false&theme_color=%23000000&show_reposts=false&show_teaser=false&visual=false`;

interface Track {
  title: string;
  user: { username: string };
  duration: number;
}

interface WidgetEvent {
  event: string;
  currentTime?: number;
  loadedProgress?: number;
  relativePosition?: number;
  currentPosition?: number;
  duration?: number;
}

interface WidgetHandle {
  bind: (event: string, cb: (e: unknown) => void) => void;
  getSounds: (cb: (sounds: Track[]) => void) => void;
  getCurrentSound: (cb: (sound: Track) => void) => void;
  getPosition: (cb: (pos: number) => void) => void;
  seekTo: (ms: number) => void;
  play: () => void;
  pause: () => void;
}

declare global {
  interface Window {
    SC?: {
      Widget: (iframe: HTMLIFrameElement) => WidgetHandle;
    };
  }
}

export default function SoundCloudPlayer() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const widgetRef = useRef<WidgetHandle | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);
  const [totalTracks, setTotalTracks] = useState(0);

  const sendCommand = useCallback((action: string, value?: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const msg = value !== undefined ? { method: action, value } : { method: action };
    iframe.contentWindow?.postMessage(JSON.stringify(msg), "*");
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://w.soundcloud.com/player/api.js";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    function onMessage(event: MessageEvent) {
      let data: WidgetEvent;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (data.event === "ready" && iframe) {
        setReady(true);
        const w = window.SC?.Widget?.(iframe);
        if (w) {
          widgetRef.current = w;
          w.bind("play", () => setPlaying(true));
          w.bind("pause", () => setPlaying(false));
          w.bind("finish", () => setPlaying(false));
          w.bind("play_progress", (e: unknown) => {
            const ev = e as { currentPosition?: number; duration?: number };
            if (ev.currentPosition !== undefined) setProgress(ev.currentPosition);
            if (ev.duration !== undefined && ev.duration > 0) setDuration(ev.duration);
          });
          w.bind("time_update", (e: unknown) => {
            const ev = e as { currentPosition?: number };
            if (ev.currentPosition !== undefined) setProgress(ev.currentPosition);
          });
          w.getSounds((sounds: Track[]) => {
            setTotalTracks(sounds.length);
          });
          w.getCurrentSound((sound: Track) => {
            if (sound) setCurrentTrack(sound);
          });
          w.bind("audio_process", () => {
            w.getPosition((pos: number) => setProgress(pos));
          });
        }
      }

      if (data.event === "play_progress" && data.currentPosition !== undefined) {
        setProgress(data.currentPosition);
      }

      if (data.event === "play") {
        setPlaying(true);
      }

      if (data.event === "pause") {
        setPlaying(false);
      }

      if (data.event === "finish") {
        setPlaying(false);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const togglePlay = useCallback(() => {
    if (!ready) return;
    sendCommand(playing ? "pause" : "play");
  }, [ready, playing, sendCommand]);

  const nextTrack = useCallback(() => {
    if (!ready) return;
    sendCommand("next");
  }, [ready, sendCommand]);

  const prevTrack = useCallback(() => {
    if (!ready) return;
    sendCommand("prev");
  }, [ready, sendCommand]);

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ready || !widgetRef.current || duration <= 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = x / rect.width;
      widgetRef.current.seekTo(Math.floor(pct * duration));
    },
    [ready, duration]
  );

  const formatTime = useCallback((ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }, []);

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <>
      {/* Hidden iframe — SoundCloud widget */}
      <iframe
        ref={iframeRef}
        src={WIDGET_SRC}
        className="soundcloud-iframe-hidden"
        allow="autoplay"
        title="SoundCloud Player"
      />

      {/* Floating player bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ease-out">
        {/* Progress bar — thin line at the very top */}
        <div
          className="h-[2px] w-full bg-hairline-dark cursor-pointer group relative"
          onClick={seek}
        >
          <div
            className="h-full bg-on-primary transition-[width] duration-100"
            style={{ width: `${progressPct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-on-primary opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPct}% - 4px)` }}
          />
        </div>

        {/* Main bar */}
        <div className="bg-canvas-night/95 backdrop-blur-sm border-t border-hairline-dark">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
            {/* Left: track info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Waveform dots indicator */}
              <div className="flex items-center gap-[2px] shrink-0">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-[3px] h-3 rounded-full transition-all duration-300 ${
                      playing ? "bg-on-primary animate-pulse" : "bg-hairline-dark"
                    }`}
                    style={{
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>

              <div className="min-w-0">
                {currentTrack ? (
                  <>
                    <p className="text-sm text-on-primary font-medium truncate">
                      {currentTrack.title}
                    </p>
                    <p className="text-xs text-on-primary-mute truncate">
                      {currentTrack.user.username}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-on-primary-mute">
                    {ready ? "PODRO GREATEST HIT MOJ" : "ЗАВАНТАЖЕННЯ..."}
                  </p>
                )}
              </div>
            </div>

            {/* Center: controls */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                onClick={prevTrack}
                disabled={!ready}
                className="p-2 text-on-primary-mute hover:text-on-primary transition-colors disabled:opacity-30 cursor-pointer"
                aria-label="Попередній"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              <button
                onClick={togglePlay}
                disabled={!ready}
                className="w-10 h-10 rounded-full border border-on-primary flex items-center justify-center text-on-primary hover:bg-on-primary hover:text-canvas-night transition-all disabled:opacity-30 cursor-pointer"
                aria-label={playing ? "Пауза" : "Грати"}
              >
                {playing ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                onClick={nextTrack}
                disabled={!ready}
                className="p-2 text-on-primary-mute hover:text-on-primary transition-colors disabled:opacity-30 cursor-pointer"
                aria-label="Наступний"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>

            {/* Right: time + expand */}
            <div className="flex items-center gap-3 justify-end flex-1">
              <span className="text-xs text-on-primary-mute font-mono tabular-nums hidden sm:block">
                {formatTime(progress)}
                <span className="mx-1">/</span>
                {formatTime(duration)}
              </span>

              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 text-on-primary-mute hover:text-on-primary transition-colors cursor-pointer"
                aria-label={expanded ? "Згорнути" : "Розгорнути"}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                >
                  <path d="M18 15l-6-6-6 6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Expanded: track list */}
          {expanded && (
            <div className="border-t border-hairline-dark bg-canvas-night-soft">
              <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3">
                <p className="micro-cap text-on-primary-mute mb-2">
                  ПОДРО GREATEST HIT MOJ — {totalTracks} ТРЕКІВ
                </p>
                <p className="text-xs text-ink-mute">
                  Звучить з SoundCloud. Натисни play щоб почати.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
