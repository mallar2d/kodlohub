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

export default function SoundCloudPlayer() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const widgetRef = useRef<WidgetAPI>(null);
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const shuffleOrder = useRef<number[]>([]);
  const shufflePos = useRef(0);

  useEffect(() => {
    if (window.SC?.Widget) return;
    const script = document.createElement("script");
    script.src = "https://w.soundcloud.com/player/api.js";
    script.async = true;
    document.head.appendChild(script);
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

  const bindWidget = useCallback(
    (iframe: HTMLIFrameElement, Widget: WidgetAPI) => {
      try {
        const w = Widget(iframe);
        widgetRef.current = w;

        w.bind(Widget.Events.READY, () => {
          try {
            setReady(true);
            w.getSounds((sounds: Track[]) => {
              setTracks(sounds);
              generateShuffleOrder(sounds.length);
            });
            w.getCurrentSound((sound: Track) => {
              if (sound && sound.title) setCurrentTrack(sound);
            });
            w.getCurrentSoundIndex((idx: number) => {
              if (typeof idx === "number") setTrackIndex(idx);
            });
          } catch (err) {
            console.error("SC READY error:", err);
          }
        });

        w.bind(Widget.Events.PLAY, () => {
          try {
            setPlaying(true);
            w.getCurrentSound((sound: Track) => {
              if (sound && sound.title) setCurrentTrack(sound);
            });
            w.getCurrentSoundIndex((idx: number) => {
              if (typeof idx === "number") setTrackIndex(idx);
            });
          } catch (err) {
            console.error("SC PLAY error:", err);
          }
        });

        w.bind(Widget.Events.PAUSE, () => {
          try {
            setPlaying(false);
          } catch (err) {
            console.error("SC PAUSE error:", err);
          }
        });

        w.bind(Widget.Events.FINISH, () => {
          try {
            setPlaying(false);
          } catch (err) {
            console.error("SC FINISH error:", err);
          }
        });

        w.bind(Widget.Events.PLAY_PROGRESS, (e: unknown) => {
          try {
            const ev = e as { currentPosition?: number };
            if (ev && typeof ev.currentPosition === "number")
              setProgress(ev.currentPosition);
          } catch (err) {
            console.error("SC PLAY_PROGRESS error:", err);
          }
        });

        w.bind(Widget.Events.TIME_UPDATE, (e: unknown) => {
          try {
            const ev = e as { currentPosition?: number; duration?: number };
            if (ev && typeof ev.currentPosition === "number")
              setProgress(ev.currentPosition);
            if (ev && typeof ev.duration === "number" && ev.duration > 0)
              setDuration(ev.duration);
          } catch (err) {
            console.error("SC TIME_UPDATE error:", err);
          }
        });

        // Fallback duration fetcher
        const durationInterval = setInterval(() => {
          try {
            w.getCurrentSound((sound: Track) => {
              if (sound?.duration && sound.duration > 0) {
                setDuration(sound.duration);
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
    },
    [generateShuffleOrder]
  );

  const initWidget = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const SC = window.SC;
    if (!SC?.Widget) {
      const retry = () => {
        if (window.SC?.Widget) {
          bindWidget(iframe, window.SC.Widget);
        } else {
          setTimeout(retry, 300);
        }
      };
      setTimeout(retry, 200);
      return;
    }

    bindWidget(iframe, SC.Widget);
  }, [bindWidget]);

  const togglePlay = useCallback(() => {
    if (!ready || !widgetRef.current) return;
    try {
      if (playing) {
        widgetRef.current.pause();
      } else {
        widgetRef.current.play();
      }
    } catch (err) {
      console.error("SC togglePlay error:", err);
    }
  }, [ready, playing]);

  const skipToTrack = useCallback(
    (index: number) => {
      if (!widgetRef.current) return;
      try {
        if (shuffle) {
          shufflePos.current = shuffleOrder.current.indexOf(index);
          if (shufflePos.current === -1) shufflePos.current = 0;
        }
        widgetRef.current.skip(index);
        widgetRef.current.play();
      } catch (err) {
        console.error("SC skipToTrack error:", err);
      }
    },
    [shuffle]
  );

  const nextTrack = useCallback(() => {
    if (!widgetRef.current) return;
    try {
      if (repeat === "one") {
        widgetRef.current.seekTo(0);
        widgetRef.current.play();
        return;
      }

      if (shuffle) {
        shufflePos.current++;
        if (shufflePos.current >= shuffleOrder.current.length) {
          if (repeat === "off") {
            widgetRef.current.pause();
            return;
          }
          generateShuffleOrder(tracks.length);
        }
        const nextIdx =
          shuffleOrder.current[shufflePos.current % shuffleOrder.current.length];
        widgetRef.current.skip(nextIdx);
        widgetRef.current.play();
        return;
      }

      if (trackIndex >= tracks.length - 1 && repeat === "off") {
        widgetRef.current.pause();
        return;
      }
      widgetRef.current.next();
    } catch (err) {
      console.error("SC nextTrack error:", err);
    }
  }, [shuffle, repeat, trackIndex, tracks.length, generateShuffleOrder]);

  const prevTrack = useCallback(() => {
    if (!widgetRef.current) return;
    try {
      if (progress > 3000) {
        widgetRef.current.seekTo(0);
        return;
      }

      if (shuffle) {
        shufflePos.current--;
        if (shufflePos.current < 0) {
          shufflePos.current = shuffleOrder.current.length - 1;
        }
        const prevIdx = shuffleOrder.current[shufflePos.current];
        widgetRef.current.skip(prevIdx);
        widgetRef.current.play();
        return;
      }

      widgetRef.current.prev();
    } catch (err) {
      console.error("SC prevTrack error:", err);
    }
  }, [shuffle, progress]);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => {
      if (!prev) {
        generateShuffleOrder(tracks.length);
      }
      return !prev;
    });
  }, [tracks.length, generateShuffleOrder]);

  const toggleRepeat = useCallback(() => {
    setRepeat((prev) => {
      if (prev === "off") return "all";
      if (prev === "all") return "one";
      return "off";
    });
  }, []);

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ready || !widgetRef.current || duration <= 0) return;
      try {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = x / rect.width;
        widgetRef.current.seekTo(Math.floor(pct * duration));
      } catch (err) {
        console.error("SC seek error:", err);
      }
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

  const artworkSrc = currentTrack?.artwork_url
    ? currentTrack.artwork_url.replace("-large", "-t300x300")
    : null;

  return (
    <>
      <iframe
        ref={iframeRef}
        src={WIDGET_SRC}
        onLoad={initWidget}
        className="soundcloud-iframe-hidden"
        allow="autoplay"
        title="SoundCloud Player"
      />

      <div className="fixed bottom-6 right-6 z-40">
        {/* Expanded card */}
        {expanded && (
          <div className="mb-3 w-80 bg-canvas-night/95 backdrop-blur-sm border border-hairline-dark rounded-lg overflow-hidden animate-slide-up">
            {/* Artwork + track info */}
            <div className="flex gap-3 p-3">
              {artworkSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artworkSrc}
                  alt={currentTrack?.title || "Обложка"}
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
                {currentTrack ? (
                  <>
                    <p className="text-xs text-on-primary font-medium truncate">
                      {currentTrack.title}
                    </p>
                    <p className="text-[11px] text-on-primary-mute truncate">
                      {safeUsername(currentTrack)}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-on-primary-mute">
                    {ready ? "PODRO GREATEST HIT MOJ" : "ЗАВАНТАЖЕННЯ..."}
                  </p>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div
              className="h-[2px] w-full bg-hairline-dark cursor-pointer relative"
              onClick={seek}
            >
              <div
                className="h-full bg-on-primary transition-[width] duration-100"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-0.5">
                {/* Shuffle */}
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

                {/* Prev */}
                <button
                  onClick={prevTrack}
                  disabled={!ready}
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

                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  disabled={!ready}
                  className="w-7 h-7 rounded-full border border-on-primary flex items-center justify-center text-on-primary hover:bg-on-primary hover:text-canvas-night transition-all disabled:opacity-30 cursor-pointer"
                  aria-label={playing ? "Пауза" : "Грати"}
                >
                  {playing ? (
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

                {/* Next */}
                <button
                  onClick={nextTrack}
                  disabled={!ready}
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

                {/* Repeat */}
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
                {formatTime(progress)}
              </span>
            </div>

            {/* Track list */}
            {tracks.length > 0 && (
              <div className="border-t border-hairline-dark max-h-48 overflow-y-auto">
                {tracks.map((track, idx) => (
                  <button
                    key={idx}
                    onClick={() => skipToTrack(idx)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors cursor-pointer ${
                      idx === trackIndex
                        ? "bg-canvas-night-soft text-on-primary"
                        : "text-on-primary-mute hover:bg-canvas-night-soft hover:text-on-primary"
                    }`}
                  >
                    <span className="text-[10px] font-mono tabular-nums w-4 shrink-0 text-center">
                      {idx === trackIndex && playing ? (
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
              playing
                ? "bg-canvas-night/95 border-on-primary text-on-primary"
                : "bg-canvas-night/95 border-hairline-dark text-on-primary-mute hover:border-on-primary hover:text-on-primary"
            }`}
            aria-label={expanded ? "Згорнути плеєр" : "Відкрити плеєр"}
          >
            {playing && (
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
            {!playing && (
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
              PODRO
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
