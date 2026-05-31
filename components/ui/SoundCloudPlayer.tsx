"use client";

import { useEffect, useState, useCallback } from "react";

const PLAYLIST_URL =
  "https://soundcloud.com/zt-barista/sets/podro-greatest-hit-moj";
const WIDGET_SRC = `https://w.soundcloud.com/player/?url=${encodeURIComponent(PLAYLIST_URL)}&auto_play=false&show_artwork=false&show_comments=false&show_user=false&hide_related=true&color=false&theme_color=%23000000&show_reposts=false&show_teaser=false&visual=false`;

interface Track {
  title: string;
  user?: { username: string };
  duration: number;
  artwork_url?: string | null;
  permalink_url?: string;
}

type RepeatMode = "off" | "all" | "one";

function safeUsername(track: Track | null): string {
  if (!track) return "";
  return track.user?.username ?? "Unknown";
}

// ── Module-level state (survives React remounts) ──────────────────
let globalIframe: HTMLIFrameElement | null = null;
let globalReady = false;
let globalTracks: Track[] = [];
let globalCurrentTrack: Track | null = null;
let globalTrackIndex = 0;
let globalProgress = 0;
let globalDuration = 0;
let globalPlaying = false;
let globalShuffle = false;
let globalRepeat: RepeatMode = "off";
let shuffleOrder: number[] = [];
let shufflePos = 0;

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}

function scPostMessage(method: string, value?: unknown) {
  if (!globalIframe?.contentWindow) return;
  const msg = value !== undefined ? { method, value } : { method };
  globalIframe.contentWindow.postMessage(JSON.stringify(msg), "*");
}

function generateShuffleOrder(count: number) {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  shuffleOrder = order;
  shufflePos = 0;
}

function handleFinish() {
  if (globalRepeat === "one") {
    scPostMessage("play");
    return;
  }

  if (globalShuffle) {
    shufflePos++;
    if (shufflePos >= shuffleOrder.length) {
      if (globalRepeat === "off") {
        globalPlaying = false;
        notify();
        return;
      }
      generateShuffleOrder(globalTracks.length);
    }
    const nextIdx = shuffleOrder[shufflePos % shuffleOrder.length];
    scPostMessage("skip", nextIdx);
    return;
  }

  if (globalTrackIndex >= globalTracks.length - 1 && globalRepeat === "off") {
    globalPlaying = false;
    notify();
    return;
  }

  scPostMessage("next");
}

function usePlayerState() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    playing: globalPlaying,
    currentTrack: globalCurrentTrack,
    trackIndex: globalTrackIndex,
    tracks: globalTracks,
    progress: globalProgress,
    duration: globalDuration,
    ready: globalReady,
    shuffle: globalShuffle,
    repeat: globalRepeat,
  };
}

function initGlobalIframe() {
  if (globalIframe) return globalIframe;

  const iframe = document.createElement("iframe");
  iframe.src = WIDGET_SRC;
  iframe.allow = "autoplay";
  iframe.title = "SoundCloud Player";
  iframe.className = "soundcloud-iframe-hidden";

  iframe.onload = () => {
    // Listen for postMessage from SoundCloud widget
    function onMessage(event: MessageEvent) {
      // Only listen from our iframe
      if (event.source !== iframe.contentWindow) return;

      let data: { method?: string; value?: unknown };
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (!data || !data.method) return;

      switch (data.method) {
        case "ready": {
          globalReady = true;
          notify();

          // Fetch tracks
          scPostMessage("getSounds");
          scPostMessage("getCurrentSound");
          scPostMessage("getDuration");

          // Retry getSounds until we get data
          let attempts = 0;
          const retryGetSounds = () => {
            if (globalTracks.length > 0 || attempts >= 20) return;
            attempts++;
            scPostMessage("getSounds");
            setTimeout(retryGetSounds, 500);
          };
          setTimeout(retryGetSounds, 500);
          break;
        }

        case "getSounds": {
          const sounds = data.value as Track[] | undefined;
          if (Array.isArray(sounds) && sounds.length > 0) {
            globalTracks = sounds;
            generateShuffleOrder(sounds.length);
            notify();
          }
          break;
        }

        case "getCurrentSound": {
          const sound = data.value as Track | undefined;
          if (sound && typeof sound === "object" && sound.title) {
            globalCurrentTrack = sound;
            if (typeof sound.duration === "number" && sound.duration > 0) {
              globalDuration = sound.duration;
            }
            notify();
          }
          break;
        }

        case "getCurrentSoundIndex": {
          const idx = data.value as number;
          if (typeof idx === "number") {
            globalTrackIndex = idx;
            notify();
          }
          break;
        }

        case "getDuration": {
          const dur = data.value as number;
          if (typeof dur === "number" && dur > 0) {
            globalDuration = dur;
            notify();
          }
          break;
        }

        case "playProgress": {
          const val = data.value as { loadedProgress?: number; currentPosition?: number; relativePosition?: number } | number;
          if (typeof val === "object" && val !== null && typeof val.currentPosition === "number") {
            globalProgress = val.currentPosition;
            notify();
          }
          break;
        }

        case "time": {
          const val = data.value as { currentPosition?: number; relativePosition?: number } | number;
          if (typeof val === "object" && val !== null && typeof val.currentPosition === "number") {
            globalProgress = val.currentPosition;
            notify();
          } else if (typeof val === "number") {
            globalProgress = val;
            notify();
          }
          break;
        }

        case "play": {
          globalPlaying = true;
          globalDuration = 0;
          scPostMessage("getCurrentSound");
          scPostMessage("getCurrentSoundIndex");
          scPostMessage("getDuration");
          notify();
          break;
        }

        case "pause": {
          globalPlaying = false;
          notify();
          break;
        }

        case "finish": {
          handleFinish();
          break;
        }
      }
    }

    window.addEventListener("message", onMessage);

    // Periodically request duration for current track
    setInterval(() => {
      if (globalReady && globalDuration === 0) {
        scPostMessage("getDuration");
        scPostMessage("getCurrentSound");
      }
    }, 2000);
  };

  document.body.appendChild(iframe);
  globalIframe = iframe;

  return iframe;
}

export default function SoundCloudPlayer() {
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const state = usePlayerState();

  useEffect(() => {
    initGlobalIframe();
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const togglePlay = useCallback(() => {
    if (!state.ready) return;
    scPostMessage(state.playing ? "pause" : "play");
  }, [state.ready, state.playing]);

  const skipToTrack = useCallback((index: number) => {
    if (globalShuffle) {
      shufflePos = shuffleOrder.indexOf(index);
      if (shufflePos === -1) shufflePos = 0;
    }
    globalTrackIndex = index;
    globalCurrentTrack = globalTracks[index] ?? null;
    globalProgress = 0;
    notify();
    scPostMessage("skip", index);
  }, []);

  const nextTrack = useCallback(() => {
    if (globalRepeat === "one") {
      scPostMessage("seekTo", 0);
      scPostMessage("play");
      return;
    }
    if (globalShuffle) {
      shufflePos++;
      if (shufflePos >= shuffleOrder.length) {
        if (globalRepeat === "off") {
          scPostMessage("pause");
          return;
        }
        generateShuffleOrder(globalTracks.length);
      }
      const nextIdx = shuffleOrder[shufflePos % shuffleOrder.length];
      scPostMessage("skip", nextIdx);
      return;
    }
    if (globalTrackIndex >= globalTracks.length - 1 && globalRepeat === "off") {
      scPostMessage("pause");
      return;
    }
    scPostMessage("next");
  }, []);

  const prevTrack = useCallback(() => {
    if (state.progress > 3000) {
      scPostMessage("seekTo", 0);
      return;
    }
    if (globalShuffle) {
      shufflePos--;
      if (shufflePos < 0) shufflePos = shuffleOrder.length - 1;
      const prevIdx = shuffleOrder[shufflePos];
      scPostMessage("skip", prevIdx);
      return;
    }
    scPostMessage("prev");
  }, [state.progress]);

  const toggleShuffle = useCallback(() => {
    globalShuffle = !globalShuffle;
    if (globalShuffle) generateShuffleOrder(globalTracks.length);
    notify();
  }, []);

  const toggleRepeat = useCallback(() => {
    if (globalRepeat === "off") globalRepeat = "all";
    else if (globalRepeat === "all") globalRepeat = "one";
    else globalRepeat = "off";
    notify();
  }, []);

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!state.ready || state.duration <= 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      scPostMessage("seekTo", Math.floor(pct * state.duration));
    },
    [state.ready, state.duration]
  );

  const formatTime = useCallback((ms: number) => {
    if (!ms || ms <= 0 || !Number.isFinite(ms)) return "0:00";
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }, []);

  const progressPct =
    state.duration > 0 ? (state.progress / state.duration) * 100 : 0;

  const artworkSrc = state.currentTrack?.artwork_url
    ? state.currentTrack.artwork_url.replace("-large", "-t300x300")
    : null;

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {expanded && (
        <div className="mb-3 w-80 bg-canvas-night/95 backdrop-blur-sm border border-hairline-dark rounded-lg overflow-hidden animate-slide-up">
          <div className="flex gap-3 p-3">
            {artworkSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={artworkSrc}
                alt={state.currentTrack?.title || "Обложка"}
                className="w-16 h-16 rounded bg-canvas-night-soft object-cover shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded bg-canvas-night-soft flex items-center justify-center shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-mute">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
            )}

            <div className="min-w-0 flex-1">
              {state.currentTrack ? (
                <>
                  <p className="text-xs text-on-primary font-medium truncate">
                    {state.currentTrack.title}
                  </p>
                  <p className="text-[11px] text-on-primary-mute truncate">
                    {safeUsername(state.currentTrack)}
                  </p>
                </>
              ) : (
                <p className="text-xs text-on-primary-mute">
                  {state.ready ? "PDR GREATEST HIT MOJ" : "ЗАВАНТАЖЕННЯ..."}
                </p>
              )}
            </div>
          </div>

          <div
            className="h-[2px] w-full bg-hairline-dark cursor-pointer relative"
            onClick={seek}
          >
            <div
              className="h-full bg-on-primary transition-[width] duration-100"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-0.5">
              <button
                onClick={toggleShuffle}
                className={`relative p-1.5 rounded transition-colors cursor-pointer ${
                  state.shuffle
                    ? "text-on-primary bg-on-primary/10"
                    : "text-on-primary-mute hover:text-on-primary"
                }`}
                aria-label={state.shuffle ? "Вимкнути перемішування" : "Увімкнути перемішування"}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 3 21 3 21 8" />
                  <line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                  <line x1="4" y1="4" x2="9" y2="9" />
                </svg>
                {state.shuffle && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-on-primary" />
                )}
              </button>

              <button
                onClick={prevTrack}
                disabled={!state.ready}
                className="p-1.5 text-on-primary-mute hover:text-on-primary transition-colors disabled:opacity-30 cursor-pointer"
                aria-label="Попередній"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              <button
                onClick={togglePlay}
                disabled={!state.ready}
                className="w-7 h-7 rounded-full border border-on-primary flex items-center justify-center text-on-primary hover:bg-on-primary hover:text-canvas-night transition-all disabled:opacity-30 cursor-pointer"
                aria-label={state.playing ? "Пауза" : "Грати"}
              >
                {state.playing ? (
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
                disabled={!state.ready}
                className="p-1.5 text-on-primary-mute hover:text-on-primary transition-colors disabled:opacity-30 cursor-pointer"
                aria-label="Наступний"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>

              <button
                onClick={toggleRepeat}
                className={`relative p-1.5 rounded transition-colors cursor-pointer ${
                  state.repeat !== "off"
                    ? "text-on-primary bg-on-primary/10"
                    : "text-on-primary-mute hover:text-on-primary"
                }`}
                aria-label={
                  state.repeat === "off"
                    ? "Повтор вимкнено"
                    : state.repeat === "all"
                      ? "Повтор всіх"
                      : "Повтор одного"
                }
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                {state.repeat === "one" && (
                  <span className="absolute -top-0.5 -right-0.5 text-[7px] font-bold text-on-primary leading-none">
                    1
                  </span>
                )}
                {state.repeat !== "off" && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-on-primary" />
                )}
              </button>
            </div>

            <span className="text-[10px] text-on-primary-mute font-mono tabular-nums">
              {formatTime(state.progress)}
            </span>
          </div>

          {state.tracks.length > 0 && (
            <div className="border-t border-hairline-dark max-h-48 overflow-y-auto">
              {state.tracks.map((track, idx) => (
                <button
                  key={idx}
                  onClick={() => skipToTrack(idx)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors cursor-pointer ${
                    idx === state.trackIndex
                      ? "bg-canvas-night-soft text-on-primary"
                      : "text-on-primary-mute hover:bg-canvas-night-soft hover:text-on-primary"
                  }`}
                >
                  <span className="text-[10px] font-mono tabular-nums w-4 shrink-0 text-center">
                    {idx === state.trackIndex && state.playing ? (
                      <span className="inline-flex gap-[2px]">
                        <span className="w-[2px] h-2 bg-on-primary rounded-full animate-pulse" />
                        <span className="w-[2px] h-3 bg-on-primary rounded-full animate-pulse [animation-delay:0.15s]" />
                        <span className="w-[2px] h-2 bg-on-primary rounded-full animate-pulse [animation-delay:0.3s]" />
                      </span>
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium truncate">
                      {track.title || `Тrek #${idx + 1}`}
                    </p>
                    <p className="text-[10px] text-ink-mute truncate">
                      {safeUsername(track)}
                    </p>
                  </div>
                  <span className="text-[10px] text-ink-mute font-mono tabular-nums shrink-0">
                    {typeof track.duration === "number" && track.duration > 0
                      ? formatTime(track.duration)
                      : "--:--"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-2 h-10 pl-3 pr-4 rounded-full border transition-all duration-200 cursor-pointer ${
            state.playing
              ? "bg-canvas-night/95 border-on-primary text-on-primary"
              : "bg-canvas-night/95 border-hairline-dark text-on-primary-mute hover:border-on-primary hover:text-on-primary"
          }`}
          aria-label={expanded ? "Згорнути плеєр" : "Відкрити плеєр"}
        >
          {state.playing && (
            <div className="flex items-center gap-[2px]">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-[2px] rounded-full bg-on-primary animate-pulse"
                  style={{ height: "8px", animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}
          {!state.playing && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
          <span className="text-[11px] font-bold tracking-[1.17px] uppercase">
            PDR
          </span>
        </button>
      </div>
    </div>
  );
}
