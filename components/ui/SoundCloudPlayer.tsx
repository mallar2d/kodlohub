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

      if (data.event === "play") setPlaying(true);
      if (data.event === "pause") setPlaying(false);
      if (data.event === "finish") setPlaying(false);
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
      {/* Hidden iframe */}
      <iframe
        ref={iframeRef}
        src={WIDGET_SRC}
        className="soundcloud-iframe-hidden"
        allow="autoplay"
        title="SoundCloud Player"
      />

      {/* Floating pill — minimized by default */}
      <div className="fixed bottom-6 right-6 z-40">
        {/* Expanded card */}
        {expanded && (
          <div className="mb-3 w-72 bg-canvas-night/95 backdrop-blur-sm border border-hairline-dark rounded-lg overflow-hidden animate-slide-up">
            {/* Progress bar */}
            <div
              className="h-[2px] w-full bg-hairline-dark cursor-pointer group relative"
              onClick={seek}
            >
              <div
                className="h-full bg-on-primary transition-[width] duration-100"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="p-3">
              {/* Track info */}
              <div className="mb-3 min-w-0">
                {currentTrack ? (
                  <>
                    <p className="text-xs text-on-primary font-medium truncate">
                      {currentTrack.title}
                    </p>
                    <p className="text-[11px] text-on-primary-mute truncate">
                      {currentTrack.user.username}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-on-primary-mute">
                    {ready ? "PODRO GREATEST HIT MOJ" : "ЗАВАНТАЖЕННЯ..."}
                  </p>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={prevTrack}
                    disabled={!ready}
                    className="p-1.5 text-on-primary-mute hover:text-on-primary transition-colors disabled:opacity-30 cursor-pointer"
                    aria-label="Попередній"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                    </svg>
                  </button>

                  <button
                    onClick={togglePlay}
                    disabled={!ready}
                    className="w-7 h-7 rounded-full border border-on-primary flex items-center justify-center text-on-primary hover:bg-on-primary hover:text-canvas-night transition-all disabled:opacity-30 cursor-pointer"
                    aria-label={playing ? "Пауза" : "Грати"}
                  >
                    {playing ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={nextTrack}
                    disabled={!ready}
                    className="p-1.5 text-on-primary-mute hover:text-on-primary transition-colors disabled:opacity-30 cursor-pointer"
                    aria-label="Наступний"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                    </svg>
                  </button>
                </div>

                <span className="text-[10px] text-on-primary-mute font-mono tabular-nums">
                  {formatTime(progress)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Toggle pill button */}
        <div className="flex justify-end">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`flex items-center gap-2 h-10 pl-3 pr-4 rounded-full border transition-all duration-200 cursor-pointer ${
              playing
                ? "bg-canvas-night/95 border-on-primary text-on-primary"
                : "bg-canvas-night/95 border-hairline-dark text-on-primary-mute hover:border-on-primary hover:text-on-primary"
            }`}
            aria-label={expanded ? "Згорнути плеєр" : "Відкрити плеєр"}
          >
            {/* Waveform dots when playing */}
            {playing && (
              <div className="flex items-center gap-[2px]">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-[2px] rounded-full bg-on-primary animate-pulse"
                    style={{
                      height: "8px",
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Play icon when not playing */}
            {!playing && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}

            <span className="text-[11px] font-bold tracking-[1.17px] uppercase">
              PODRO
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
