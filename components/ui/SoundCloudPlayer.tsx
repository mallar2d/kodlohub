"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import BARISTA_TRACKS from "@/lib/barista-tracks.json";

const PLAYLIST_URL = "https://soundcloud.com/zt-barista/sets/podro-greatest-hit-moj";
const WIDGET_SRC = `https://w.soundcloud.com/player/?url=${encodeURIComponent(PLAYLIST_URL)}&auto_play=false&show_artwork=false&show_comments=false&show_user=false&hide_related=true&color=false&theme_color=%23000000&show_reposts=false&show_teaser=false&visual=false`;

export interface Track {
  title: string;
  duration: number;
  user: { username: string };
  artwork_url?: string | null;
  permalink_url?: string;
}

type RepeatMode = "off" | "all" | "one";

function safeUsername(track: Track | null): string {
  if (!track) return "BARISTA";
  return track.user?.username || "BARISTA";
}

// ── Module-level persistent state (survives React remounts & routing) ─────
let globalIframe: HTMLIFrameElement | null = null;
let globalWidget: any = null;
let globalReady = false;
let globalTracks: Track[] = BARISTA_TRACKS as Track[];
let globalTrackIndex = 0;
let globalCurrentTrack: Track = (BARISTA_TRACKS[0] as Track) || {
  title: "Настане 22:00",
  duration: 191326,
  user: { username: "BARISTA" },
  artwork_url: "https://i1.sndcdn.com/artworks-QmjNhEuljzdwnhx5-vymNmg-large.png",
};
let globalProgress = 0;
let globalDuration = globalCurrentTrack.duration || 191326;
let globalPlaying = false;
let globalShuffle = false;
let globalRepeat: RepeatMode = "off";
let shuffleOrder: number[] = [];
let shufflePos = 0;
let lastProgressTimestamp = Date.now();

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}

function generateShuffleOrder(count: number) {
  if (count <= 0) return;
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  shuffleOrder = order;
  shufflePos = 0;
}

function sendSCCommand(method: string, value?: unknown) {
  if (globalWidget && typeof globalWidget[method] === "function") {
    try {
      if (value !== undefined) {
        globalWidget[method](value);
      } else {
        globalWidget[method]();
      }
      return;
    } catch {
      // fallback to postMessage
    }
  }

  if (globalIframe?.contentWindow) {
    const msg = value !== undefined ? { method, value } : { method };
    globalIframe.contentWindow.postMessage(JSON.stringify(msg), "*");
  }
}

function handleFinish() {
  if (globalRepeat === "one") {
    sendSCCommand("seekTo", 0);
    sendSCCommand("play");
    globalProgress = 0;
    globalPlaying = true;
    notify();
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
    skipTrackInternal(nextIdx);
    return;
  }

  if (globalTrackIndex >= globalTracks.length - 1 && globalRepeat === "off") {
    globalPlaying = false;
    notify();
    return;
  }

  const nextIdx = (globalTrackIndex + 1) % globalTracks.length;
  skipTrackInternal(nextIdx);
}

function skipTrackInternal(index: number) {
  if (index < 0 || index >= globalTracks.length) return;
  globalTrackIndex = index;
  globalCurrentTrack = globalTracks[index];
  globalDuration = globalTracks[index].duration || 0;
  globalProgress = 0;
  globalPlaying = true;
  lastProgressTimestamp = Date.now();
  notify();

  sendSCCommand("skip", index);
  sendSCCommand("play");
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
    duration: globalDuration > 0 ? globalDuration : globalCurrentTrack.duration,
    ready: globalReady,
    shuffle: globalShuffle,
    repeat: globalRepeat,
  };
}

function loadSoundCloudSDK(): Promise<any> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(null);
    if ((window as any).SC?.Widget) {
      return resolve((window as any).SC.Widget);
    }

    const existing = document.getElementById("sc-widget-api");
    if (existing) {
      existing.addEventListener("load", () => {
        resolve((window as any).SC?.Widget || null);
      });
      return;
    }

    const script = document.createElement("script");
    script.id = "sc-widget-api";
    script.src = "https://w.soundcloud.com/player/api.js";
    script.async = true;
    script.onload = () => {
      resolve((window as any).SC?.Widget || null);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

function initGlobalIframe() {
  if (globalIframe) return globalIframe;

  const iframe = document.createElement("iframe");
  iframe.src = WIDGET_SRC;
  iframe.allow = "autoplay";
  iframe.title = "SoundCloud Player";
  iframe.className = "soundcloud-iframe-hidden";
  iframe.style.position = "absolute";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";
  iframe.style.pointerEvents = "none";

  iframe.onload = async () => {
    const SCWidget = await loadSoundCloudSDK();
    if (SCWidget) {
      try {
        const widget = SCWidget(iframe);
        globalWidget = widget;
        const Events = SCWidget.Events;

        widget.bind(Events.READY, () => {
          globalReady = true;
          notify();
        });

        widget.bind(Events.PLAY, () => {
          globalPlaying = true;
          lastProgressTimestamp = Date.now();
          widget.getCurrentSoundIndex((idx: number) => {
            if (typeof idx === "number" && globalTracks[idx]) {
              globalTrackIndex = idx;
              globalCurrentTrack = globalTracks[idx];
              globalDuration = globalTracks[idx].duration || globalDuration;
            }
            notify();
          });
          notify();
        });

        widget.bind(Events.PAUSE, () => {
          globalPlaying = false;
          notify();
        });

        widget.bind(Events.PLAY_PROGRESS, (data: any) => {
          if (data && typeof data.currentPosition === "number") {
            globalProgress = data.currentPosition;
            lastProgressTimestamp = Date.now();
            if (!globalPlaying) globalPlaying = true;
            notify();
          }
        });

        widget.bind(Events.FINISH, () => {
          handleFinish();
        });
      } catch (err) {
        console.error("SC Widget bind error:", err);
      }
    }

    // Fallback native postMessage event listener
    function onMessage(event: MessageEvent) {
      if (event.source !== iframe.contentWindow) return;
      let data: any = null;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (!data || typeof data !== "object") return;

      const action = data.method || data.event;
      const payload = data.value !== undefined ? data.value : data.data;
      if (!action) return;

      switch (action) {
        case "ready":
          globalReady = true;
          notify();
          break;
        case "play":
          globalPlaying = true;
          lastProgressTimestamp = Date.now();
          notify();
          break;
        case "pause":
          globalPlaying = false;
          notify();
          break;
        case "playProgress":
        case "time":
        case "seek":
          if (typeof payload === "number") {
            globalProgress = payload;
            lastProgressTimestamp = Date.now();
            notify();
          } else if (payload && typeof payload.currentPosition === "number") {
            globalProgress = payload.currentPosition;
            lastProgressTimestamp = Date.now();
            notify();
          }
          break;
        case "finish":
          handleFinish();
          break;
      }
    }

    window.addEventListener("message", onMessage);
  };

  document.body.appendChild(iframe);
  globalIframe = iframe;

  return iframe;
}

export default function SoundCloudPlayer() {
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [seekPreviewPct, setSeekPreviewPct] = useState<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const state = usePlayerState();

  const ensureIframe = useCallback(() => {
    if (typeof window !== "undefined" && !globalIframe) {
      initGlobalIframe();
    }
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    if (typeof window !== "undefined") {
      const timer = setTimeout(() => {
        initGlobalIframe();
      }, 500);
      return () => {
        cancelAnimationFrame(id);
        clearTimeout(timer);
      };
    }
    return () => cancelAnimationFrame(id);
  }, []);

  // Smooth client-side timer interpolation while audio is playing
  useEffect(() => {
    if (!state.playing) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - lastProgressTimestamp;
      if (delta >= 100 && delta < 2500) {
        globalProgress += delta;
        lastProgressTimestamp = now;
        notify();
      }
    }, 150);

    return () => clearInterval(interval);
  }, [state.playing]);

  const togglePlay = useCallback(() => {
    ensureIframe();
    if (state.playing) {
      globalPlaying = false;
      notify();
      sendSCCommand("pause");
    } else {
      globalPlaying = true;
      lastProgressTimestamp = Date.now();
      notify();
      sendSCCommand("play");
    }
  }, [state.playing, ensureIframe]);

  const handleToggleExpanded = useCallback(() => {
    ensureIframe();
    setExpanded((prev) => !prev);
  }, [ensureIframe]);

  const skipToTrack = useCallback((index: number) => {
    ensureIframe();
    if (globalShuffle) {
      shufflePos = shuffleOrder.indexOf(index);
      if (shufflePos === -1) shufflePos = 0;
    }
    skipTrackInternal(index);
  }, [ensureIframe]);

  const nextTrack = useCallback(() => {
    ensureIframe();
    if (globalRepeat === "one") {
      sendSCCommand("seekTo", 0);
      sendSCCommand("play");
      globalProgress = 0;
      globalPlaying = true;
      notify();
      return;
    }
    if (globalShuffle) {
      shufflePos++;
      if (shufflePos >= shuffleOrder.length) {
        if (globalRepeat === "off") {
          globalPlaying = false;
          sendSCCommand("pause");
          notify();
          return;
        }
        generateShuffleOrder(globalTracks.length);
      }
      const nextIdx = shuffleOrder[shufflePos % shuffleOrder.length];
      skipTrackInternal(nextIdx);
      return;
    }
    const nextIdx = (globalTrackIndex + 1) % globalTracks.length;
    skipTrackInternal(nextIdx);
  }, [ensureIframe]);

  const prevTrack = useCallback(() => {
    ensureIframe();
    if (state.progress > 3000) {
      sendSCCommand("seekTo", 0);
      globalProgress = 0;
      notify();
      return;
    }
    if (globalShuffle) {
      shufflePos--;
      if (shufflePos < 0) shufflePos = shuffleOrder.length - 1;
      const prevIdx = shuffleOrder[shufflePos];
      skipTrackInternal(prevIdx);
      return;
    }
    const prevIdx = (globalTrackIndex - 1 + globalTracks.length) % globalTracks.length;
    skipTrackInternal(prevIdx);
  }, [ensureIframe, state.progress]);

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

  // Smooth Scrubber handling
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!state.duration || state.duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetMs = Math.floor(pct * state.duration);
    globalProgress = targetMs;
    lastProgressTimestamp = Date.now();
    notify();
    sendSCCommand("seekTo", targetMs);
  };

  const formatTime = useCallback((ms: number) => {
    if (!ms || ms <= 0 || !Number.isFinite(ms)) return "0:00";
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }, []);

  const currentDuration = state.duration > 0 ? state.duration : (state.currentTrack?.duration || 191000);
  const currentProgress = Math.min(state.progress, currentDuration);
  const progressPct = currentDuration > 0 ? (currentProgress / currentDuration) * 100 : 0;
  const displayPct = seekPreviewPct !== null ? seekPreviewPct * 100 : progressPct;

  const artworkSrc = state.currentTrack?.artwork_url
    ? state.currentTrack.artwork_url.replace("-large", "-t300x300")
    : "https://i1.sndcdn.com/artworks-l8D04m4jljKAcKmt-bGep7w-t500x500.jpg";

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {expanded && (
        <div className="mb-3 w-80 sm:w-88 bg-canvas-night/95 backdrop-blur-md border border-hairline-dark rounded-2xl overflow-hidden shadow-2xl animate-slide-up select-none">
          {/* Header Track Info */}
          <div className="flex gap-3.5 p-4 items-center">
            {/* Album Artwork */}
            <div className="w-14 h-14 rounded-xl bg-canvas-night-soft relative overflow-hidden shrink-0 border border-hairline-dark/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={artworkSrc}
                alt={state.currentTrack?.title || "BARISTA"}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm text-on-primary font-bold truncate leading-tight mb-1">
                {state.currentTrack?.title || "Настане 22:00"}
              </p>
              <p className="text-xs text-ink-mute font-mono truncate">
                {safeUsername(state.currentTrack)}
              </p>
            </div>
          </div>

          {/* Interactive Timeline Scrubber Bar */}
          <div className="px-4 py-1">
            <div
              ref={progressBarRef}
              className="group relative h-4 flex items-center cursor-pointer"
              onClick={handleSeek}
            >
              {/* Background track line */}
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden transition-all group-hover:h-2">
                <div
                  className="h-full bg-on-primary rounded-full transition-all duration-75"
                  style={{ width: `${Math.max(0, Math.min(100, displayPct))}%` }}
                />
              </div>

              {/* Scrubber thumb */}
              <div
                className="absolute w-3 h-3 rounded-full bg-white shadow-md -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ left: `${Math.max(0, Math.min(100, displayPct))}%` }}
              />
            </div>

            {/* Time labels (current / duration) */}
            <div className="flex items-center justify-between text-[10px] text-ink-mute font-mono pt-1">
              <span>{formatTime(currentProgress)}</span>
              <span>{formatTime(currentDuration)}</span>
            </div>
          </div>

          {/* Control Buttons Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline-dark/60">
            <div className="flex items-center gap-1">
              {/* Shuffle button */}
              <button
                onClick={toggleShuffle}
                className={`relative p-2 rounded-full transition-colors cursor-pointer ${
                  state.shuffle
                    ? "text-on-primary bg-white/15"
                    : "text-ink-mute hover:text-on-primary"
                }`}
                aria-label="Перемішування"
                title="Перемішування"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 3 21 3 21 8" />
                  <line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                  <line x1="4" y1="4" x2="9" y2="9" />
                </svg>
              </button>

              {/* Previous button */}
              <button
                onClick={prevTrack}
                className="p-2 text-ink-mute hover:text-on-primary transition-colors cursor-pointer"
                aria-label="Попередній трек"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              {/* Play/Pause primary button */}
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-white text-canvas-night flex items-center justify-center hover:scale-105 transition-all cursor-pointer shadow-lg mx-1"
                aria-label={state.playing ? "Пауза" : "Грати"}
              >
                {state.playing ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Next button */}
              <button
                onClick={nextTrack}
                className="p-2 text-ink-mute hover:text-on-primary transition-colors cursor-pointer"
                aria-label="Наступний трек"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>

              {/* Repeat button */}
              <button
                onClick={toggleRepeat}
                className={`relative p-2 rounded-full transition-colors cursor-pointer ${
                  state.repeat !== "off"
                    ? "text-on-primary bg-white/15"
                    : "text-ink-mute hover:text-on-primary"
                }`}
                aria-label="Повтор"
                title="Повтор"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                {state.repeat === "one" && (
                  <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-on-primary leading-none">
                    1
                  </span>
                )}
              </button>
            </div>

            <span className="text-[11px] text-ink-mute font-mono uppercase">
              {state.playing ? "PLAYING" : "PAUSED"}
            </span>
          </div>

          {/* Playlist Track List (All 33 Tracks) */}
          <div className="max-h-56 overflow-y-auto divide-y divide-hairline-dark/40 scrollbar-thin">
            {state.tracks.map((track, idx) => {
              const isCurrent = idx === state.trackIndex;
              return (
                <button
                  key={idx}
                  onClick={() => skipToTrack(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer group ${
                    isCurrent
                      ? "bg-white/[0.08] text-on-primary"
                      : "text-ink-mute hover:bg-white/[0.04] hover:text-on-primary"
                  }`}
                >
                  <span className="text-xs font-mono tabular-nums w-4 shrink-0 text-center">
                    {isCurrent && state.playing ? (
                      <span className="inline-flex gap-[2px] items-end h-3">
                        <span className="w-[2px] h-2 bg-on-primary rounded-full animate-pulse" />
                        <span className="w-[2px] h-3 bg-on-primary rounded-full animate-pulse [animation-delay:0.15s]" />
                        <span className="w-[2px] h-2 bg-on-primary rounded-full animate-pulse [animation-delay:0.3s]" />
                      </span>
                    ) : (
                      idx + 1
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className={`text-xs truncate font-medium ${isCurrent ? "text-on-primary font-bold" : "text-zinc-300 group-hover:text-white"}`}>
                      {track.title}
                    </p>
                    <p className="text-[10px] text-ink-mute font-mono truncate">
                      {safeUsername(track)}
                    </p>
                  </div>

                  <span className="text-[10px] text-ink-mute font-mono tabular-nums shrink-0">
                    {typeof track.duration === "number" && track.duration > 0
                      ? formatTime(track.duration)
                      : "--:--"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Widget Trigger Pill */}
      <div className="flex justify-end">
        <button
          onClick={handleToggleExpanded}
          className={`flex items-center gap-2.5 h-10 pl-3.5 pr-4 rounded-full border transition-all duration-200 cursor-pointer shadow-xl ${
            state.playing
              ? "bg-canvas-night/95 border-on-primary text-on-primary"
              : "bg-canvas-night/95 border-hairline-dark text-on-primary-mute hover:border-on-primary hover:text-on-primary"
          }`}
          aria-label={expanded ? "Згорнути плеєр" : "Відкрити плеєр"}
        >
          {state.playing ? (
            <div className="flex items-center gap-[2px]">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-[2px] rounded-full bg-on-primary animate-pulse"
                  style={{ height: "10px", animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
          <span className="text-[11px] font-bold tracking-[1.2px] uppercase">
            PDR
          </span>
        </button>
      </div>
    </div>
  );
}
