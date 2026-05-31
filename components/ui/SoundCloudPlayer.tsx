"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WidgetAPI = any;

declare global {
  interface Window {
    SC?: { Widget: WidgetAPI };
  }
}

type RepeatMode = "off" | "all" | "one";

function safeUsername(track: Track | null): string {
  if (!track) return "";
  return track.user?.username ?? "Unknown";
}

// Module-level singletons — survive remounts
let globalWidget: WidgetAPI = null;
let globalIframe: HTMLIFrameElement | null = null;
let globalReady = false;
let globalTracks: Track[] = [];
let globalCurrentTrack: Track | null = null;
let globalTrackIndex = 0;
let globalProgress = 0;
let globalDuration = 0;
let globalPlaying = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
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
  };
}

function initGlobalIframe() {
  if (globalIframe) return globalIframe;

  const iframe = document.createElement("iframe");
  iframe.src = WIDGET_SRC;
  iframe.allow = "autoplay";
  iframe.title = "SoundCloud Player";
  iframe.className = "soundcloud-iframe-hidden";
  document.body.appendChild(iframe);
  globalIframe = iframe;

  const tryBind = () => {
    const SC = window.SC;
    if (!SC?.Widget) {
      setTimeout(tryBind, 300);
      return;
    }

    try {
      const w = SC.Widget(iframe);
      globalWidget = w;

      w.bind(SC.Widget.Events.READY, () => {
        try {
          globalReady = true;
          w.getSounds((sounds: Track[]) => {
            globalTracks = sounds;
            notify();
          });
          w.getCurrentSound((sound: Track) => {
            if (sound && sound.title) {
              globalCurrentTrack = sound;
              notify();
            }
          });
          w.getCurrentSoundIndex((idx: number) => {
            if (typeof idx === "number") {
              globalTrackIndex = idx;
              notify();
            }
          });
        } catch (err) {
          console.error("SC READY error:", err);
        }
        notify();
      });

      w.bind(SC.Widget.Events.PLAY, () => {
        try {
          globalPlaying = true;
          w.getCurrentSound((sound: Track) => {
            if (sound && sound.title) {
              globalCurrentTrack = sound;
            }
          });
          w.getCurrentSoundIndex((idx: number) => {
            if (typeof idx === "number") globalTrackIndex = idx;
          });
        } catch (err) {
          console.error("SC PLAY error:", err);
        }
        notify();
      });

      w.bind(SC.Widget.Events.PAUSE, () => {
        globalPlaying = false;
        notify();
      });

      w.bind(SC.Widget.Events.FINISH, () => {
        globalPlaying = false;
        notify();
      });

      w.bind(SC.Widget.Events.PLAY_PROGRESS, (e: unknown) => {
        try {
          const ev = e as { currentPosition?: number };
          if (ev && typeof ev.currentPosition === "number") {
            globalProgress = ev.currentPosition;
            notify();
          }
        } catch (err) {
          console.error("SC PLAY_PROGRESS error:", err);
        }
      });

      w.bind(SC.Widget.Events.TIME_UPDATE, (e: unknown) => {
        try {
          const ev = e as { currentPosition?: number; duration?: number };
          if (ev && typeof ev.currentPosition === "number")
            globalProgress = ev.currentPosition;
          if (ev && typeof ev.duration === "number" && ev.duration > 0)
            globalDuration = ev.duration;
          notify();
        } catch (err) {
          console.error("SC TIME_UPDATE error:", err);
        }
      });

      const durationInterval = setInterval(() => {
        try {
          w.getCurrentSound((sound: Track) => {
            if (sound?.duration && sound.duration > 0) {
              globalDuration = sound.duration;
              notify();
              clearInterval(durationInterval);
            }
          });
        } catch {
          clearInterval(durationInterval);
        }
      }, 1000);
    } catch (err) {
      console.error("SC bindWidget error:", err);
    }
  };

  iframe.onload = () => {
    setTimeout(tryBind, 100);
  };

  return iframe;
}

export default function SoundCloudPlayer() {
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const shuffleOrder = useRef<number[]>([]);
  const shufflePos = useRef(0);

  const state = usePlayerState();

  useEffect(() => {
    initGlobalIframe();
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const generateShuffleOrder = useCallback((count: number) => {
    const order = Array.from({ length: count }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    shuffleOrder.current = order;
    shufflePos.current = 0;
  }, []);

  const togglePlay = useCallback(() => {
    if (!state.ready || !globalWidget) return;
    try {
      if (state.playing) {
        globalWidget.pause();
      } else {
        globalWidget.play();
      }
    } catch (err) {
      console.error("SC togglePlay error:", err);
    }
  }, [state.ready, state.playing]);

  const skipToTrack = useCallback(
    (index: number) => {
      if (!globalWidget) return;
      try {
        if (shuffle) {
          shufflePos.current = shuffleOrder.current.indexOf(index);
          if (shufflePos.current === -1) shufflePos.current = 0;
        }
        globalWidget.skip(index);
        globalWidget.play();
      } catch (err) {
        console.error("SC skipToTrack error:", err);
      }
    },
    [shuffle]
  );

  const nextTrack = useCallback(() => {
    if (!globalWidget) return;
    try {
      if (repeat === "one") {
        globalWidget.seekTo(0);
        globalWidget.play();
        return;
      }

      if (shuffle) {
        shufflePos.current++;
        if (shufflePos.current >= shuffleOrder.current.length) {
          if (repeat === "off") {
            globalWidget.pause();
            return;
          }
          generateShuffleOrder(state.tracks.length);
        }
        const nextIdx =
          shuffleOrder.current[shufflePos.current % shuffleOrder.current.length];
        globalWidget.skip(nextIdx);
        globalWidget.play();
        return;
      }

      if (state.trackIndex >= state.tracks.length - 1 && repeat === "off") {
        globalWidget.pause();
        return;
      }
      globalWidget.next();
    } catch (err) {
      console.error("SC nextTrack error:", err);
    }
  }, [shuffle, repeat, state.trackIndex, state.tracks.length, generateShuffleOrder]);

  const prevTrack = useCallback(() => {
    if (!globalWidget) return;
    try {
      if (state.progress > 3000) {
        globalWidget.seekTo(0);
        return;
      }

      if (shuffle) {
        shufflePos.current--;
        if (shufflePos.current < 0) {
          shufflePos.current = shuffleOrder.current.length - 1;
        }
        const prevIdx = shuffleOrder.current[shufflePos.current];
        globalWidget.skip(prevIdx);
        globalWidget.play();
        return;
      }

      globalWidget.prev();
    } catch (err) {
      console.error("SC prevTrack error:", err);
    }
  }, [shuffle, state.progress]);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => {
      if (!prev) {
        generateShuffleOrder(state.tracks.length);
      }
      return !prev;
    });
  }, [state.tracks.length, generateShuffleOrder]);

  const toggleRepeat = useCallback(() => {
    setRepeat((prev) => {
      if (prev === "off") return "all";
      if (prev === "all") return "one";
      return "off";
    });
  }, []);

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!state.ready || !globalWidget || state.duration <= 0) return;
      try {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = x / rect.width;
        globalWidget.seekTo(Math.floor(pct * state.duration));
      } catch (err) {
        console.error("SC seek error:", err);
      }
    },
    [state.ready, state.duration]
  );

  const formatTime = useCallback((ms: number) => {
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
      {/* Expanded card */}
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
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-ink-mute"
                >
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
                className={`p-1.5 transition-colors cursor-pointer relative ${
                  shuffle
                    ? "text-on-primary"
                    : "text-on-primary-mute hover:text-on-primary"
                }`}
                aria-label="Перемішати"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="16 3 21 3 21 8" />
                  <line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                  <line x1="4" y1="4" x2="9" y2="9" />
                </svg>
              </button>

              <button
                onClick={prevTrack}
                disabled={!state.ready}
                className="p-1.5 text-on-primary-mute hover:text-on-primary transition-colors disabled:opacity-30 cursor-pointer"
                aria-label="Попередній"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
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
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                  </svg>
                ) : (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
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
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>

              <button
                onClick={toggleRepeat}
                className={`p-1.5 transition-colors cursor-pointer relative ${
                  repeat !== "off"
                    ? "text-on-primary"
                    : "text-on-primary-mute hover:text-on-primary"
                }`}
                aria-label={`Повтор: ${repeat}`}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                {repeat === "one" && (
                  <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-on-primary">
                    1
                  </span>
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
                      {track.title}
                    </p>
                    <p className="text-[10px] text-ink-mute truncate">
                      {safeUsername(track)}
                    </p>
                  </div>
                  <span className="text-[10px] text-ink-mute font-mono tabular-nums shrink-0">
                    {formatTime(track.duration)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toggle pill */}
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
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
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
