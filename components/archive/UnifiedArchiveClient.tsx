"use client";

import { useState, useMemo, useEffect, useRef, type ReactNode, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import LikeButton from "@/components/ui/LikeButton";
import MediaComments from "@/components/ui/MediaComments";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import { stripWikiMarkup } from "@/app/(main)/wiki/WikiClient";
import { useAuth } from "@/components/providers/AuthProvider";

export interface MediaItem {
  id: string;
  file_url: string;
  file_type: string;
  caption: string | null;
  created_at: string;
  author_id: string;
  like_count?: number;
  profiles?: { display_name: string; username: string; avatar_url: string | null } | null;
}

export interface PostItem {
  id: string;
  title: string;
  content: string;
  tags: string[] | null;
  type: string;
  status: string;
  created_at: string;
  author_id: string;
  like_count?: number;
  profiles?: { display_name: string; username: string; avatar_url: string | null } | null;
}

export interface LoreItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  media_id: string | null;
  author_id: string;
  created_at: string;
  like_count?: number;
  profiles?: { display_name: string; username?: string; avatar_url: string | null } | null;
  media?: { id: string; file_url: string; file_type: string; caption?: string | null } | null;
}

export interface PodcastEpisodeItem {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  duration: number;
  episode_number: number;
  created_at: string;
  profiles?: { display_name: string; username: string; avatar_url: string | null } | null;
}

export type ArchiveTab = "all" | "media" | "posts" | "lore" | "podcasts";
type ViewMode = "masonry" | "grid" | "list";

export type MediaKind = "image" | "video" | "audio" | "text" | "pdf" | "other";

export function getFileKind(url: string = "", file_type: string = ""): MediaKind {
  const clean = url.toLowerCase().split("?")[0];
  const ext = clean.split(".").pop() || "";
  if (file_type === "image" || ["jpg", "jpeg", "png", "webp", "gif", "svg", "avif"].includes(ext)) return "image";
  if (file_type === "video" || ["mp4", "webm", "mov", "mkv", "ogv"].includes(ext)) return "video";
  if (file_type === "audio" || ["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext)) return "audio";
  if (["md", "markdown", "txt", "json", "xml", "csv", "log", "js", "ts", "tsx", "html", "css", "py", "rs", "go"].includes(ext)) return "text";
  if (ext === "pdf") return "pdf";
  return "other";
}

const VIEW_MODES: { key: ViewMode; label: string; icon: ReactNode }[] = [
  {
    key: "masonry",
    label: "Масонрі",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
        <rect x="0" y="0" width="6" height="8" rx="1" />
        <rect x="8" y="0" width="8" height="5" rx="1" />
        <rect x="0" y="10" width="8" height="6" rx="1" />
        <rect x="10" y="7" width="6" height="9" rx="1" />
      </svg>
    ),
  },
  {
    key: "grid",
    label: "Сітка",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
        <rect x="0" y="0" width="7" height="7" rx="1" />
        <rect x="9" y="0" width="7" height="7" rx="1" />
        <rect x="0" y="9" width="7" height="7" rx="1" />
        <rect x="9" y="9" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    key: "list",
    label: "Список",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
        <rect x="0" y="0" width="16" height="3" rx="1" />
        <rect x="0" y="5" width="16" height="3" rx="1" />
        <rect x="0" y="10" width="16" height="3" rx="1" />
      </svg>
    ),
  },
];

/**
 * Text & Markdown Document Viewer for Lightbox
 */
function MarkdownTextFileViewer({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then((res) => res.text())
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => {
        setContent("Не вдалося завантажити вміст файлу");
        setLoading(false);
      });
  }, [url]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-on-primary border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="card-dark p-6 rounded-2xl max-h-[70vh] overflow-auto text-left font-mono text-xs sm:text-sm text-on-primary leading-relaxed whitespace-pre-wrap select-text bg-[#0a0a0c] border border-hairline-dark">
      {content}
    </div>
  );
}

/**
 * Interactive Media Card with Pure Monochrome xAI Styling
 */
function MediaCardItem({
  item,
  viewMode,
  onClick,
  onLikeChange,
}: {
  item: MediaItem;
  viewMode: ViewMode;
  onClick: () => void;
  onLikeChange?: (itemId: string, newCount: number) => void;
}) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [scrubPercent, setScrubPercent] = useState<number | null>(null);
  const [heartAnim, setHeartAnim] = useState<{ id: number; x: number; y: number } | null>(null);
  const [isLikedLocal, setIsLikedLocal] = useState(false);
  const [likeCountLocal, setLikeCountLocal] = useState(item.like_count || 0);

  const kind = getFileKind(item.file_url, item.file_type);
  const fileName = item.caption || item.file_url.split("/").pop() || "Медіафайл";

  // Trigger double-click instant like
  const handleDoubleClick = async (e: MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHeartAnim({ id: Date.now(), x, y });
    setTimeout(() => setHeartAnim(null), 800);

    if (!user) return;

    if (!isLikedLocal) {
      setIsLikedLocal(true);
      setLikeCountLocal((prev) => prev + 1);
      try {
        await fetch("/api/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemType: "media", itemId: item.id }),
        });
        if (onLikeChange) onLikeChange(item.id, likeCountLocal + 1);
      } catch (err) {
        console.error("Instant like failed:", err);
      }
    }
  };

  // Video hover playback & frame scrubbing
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (kind === "video" && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setScrubPercent(null);
    if (kind === "video" && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0.2;
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (kind !== "video" || !videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setScrubPercent(percent);
    if (videoRef.current.duration) {
      videoRef.current.currentTime = percent * videoRef.current.duration;
    }
  };

  if (viewMode === "list") {
    return (
      <div
        onClick={onClick}
        onDoubleClick={handleDoubleClick}
        className="card-dark p-3 rounded-xl hover:border-white/30 transition-all flex items-center justify-between gap-4 cursor-pointer relative overflow-hidden group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-16 h-12 rounded-lg bg-canvas-night relative shrink-0 overflow-hidden flex items-center justify-center border border-hairline-dark/60">
            {kind === "image" ? (
              <Image src={item.file_url} alt={fileName} fill className="object-cover" />
            ) : kind === "video" ? (
              <video src={`${item.file_url}#t=0.5`} className="w-full h-full object-cover" preload="metadata" muted />
            ) : kind === "audio" ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-on-primary">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-ink-mute">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              </svg>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-sm text-on-primary font-medium truncate group-hover:text-white transition-colors">
              {item.caption ? stripWikiMarkup(item.caption) : fileName}
            </p>
            <p className="text-xs text-ink-mute font-mono">
              {kind === "image" ? "ФОТО" : kind === "video" ? "ВІДЕО" : kind === "audio" ? "АУДІО" : "ДОКУМЕНТ"} · {new Date(item.created_at).toLocaleDateString("uk-UA")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pr-2" onClick={(e) => e.stopPropagation()}>
          <LikeButton itemType="media" itemId={item.id} initialCount={item.like_count || 0} compact />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      className="card-dark rounded-xl overflow-hidden hover:border-white/30 transition-all group flex flex-col justify-between cursor-pointer relative select-none"
    >
      {/* Double click heart popup */}
      {heartAnim && (
        <div
          className="absolute pointer-events-none z-40 animate-[heartPop_0.7s_ease-out_forwards]"
          style={{ left: heartAnim.x - 24, top: heartAnim.y - 24 }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
      )}

      <div>
        {/* Media Preview Container */}
        <div className="relative w-full bg-canvas-night overflow-hidden">
          {kind === "image" ? (
            <div className={`relative w-full ${viewMode === "grid" ? "h-48" : "min-h-[160px]"}`}>
              <Image
                src={item.file_url}
                alt={fileName}
                width={viewMode === "grid" ? 400 : 600}
                height={viewMode === "grid" ? 300 : 450}
                className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                  viewMode === "grid" ? "h-48" : "h-auto"
                }`}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                loading="lazy"
              />
            </div>
          ) : kind === "video" ? (
            <div className={`relative w-full ${viewMode === "grid" ? "h-48" : "min-h-[180px]"} bg-black`}>
              <video
                ref={videoRef}
                src={`${item.file_url}#t=0.5`}
                preload="metadata"
                muted
                loop
                playsInline
                className={`w-full object-cover ${viewMode === "grid" ? "h-48" : "h-auto"}`}
              />

              {/* Play Badge Icon Overlay */}
              {!isHovered && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-canvas-night/70 border border-hairline-dark flex items-center justify-center text-on-primary backdrop-blur-xs">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Hover Scrubbing Timeline Bar */}
              {isHovered && scrubPercent !== null && (
                <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20 pointer-events-none">
                  <div className="h-full bg-white" style={{ width: `${scrubPercent * 100}%` }} />
                </div>
              )}

              {/* Video Scrub Hint Tooltip */}
              {isHovered && (
                <div className="absolute top-2.5 right-2.5 pointer-events-none micro-cap px-2 py-0.5 rounded bg-canvas-night/80 border border-hairline-dark text-[9px] text-on-primary font-mono">
                  ПЕРЕМОТКА
                </div>
              )}
            </div>
          ) : kind === "audio" ? (
            /* Audio Card Preview */
            <div className="p-6 bg-canvas-night flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[160px] border-b border-hairline-dark/60">
              {/* Equalizer Bars Graphic */}
              <div className="flex items-end gap-1 mb-4 h-10">
                {[12, 24, 36, 18, 30, 42, 28, 14, 38, 22, 16, 32].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-white/40 rounded-full transition-all duration-300 group-hover:bg-white"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-white/[0.08] border border-hairline-dark flex items-center justify-center text-on-primary shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </span>
                <span className="text-xs font-mono text-on-primary font-semibold truncate max-w-[180px]">
                  {fileName}
                </span>
              </div>
            </div>
          ) : (
            /* Document / Text / PDF Preview */
            <div className="p-6 bg-canvas-night flex flex-col items-center justify-center text-center min-h-[160px] border-b border-hairline-dark/60">
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-hairline-dark flex items-center justify-center text-on-primary mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <p className="text-xs font-mono text-on-primary truncate max-w-[200px] font-semibold">{fileName}</p>
            </div>
          )}

          {/* Type Badge */}
          <span className="absolute top-2.5 left-2.5 micro-cap px-2 py-0.5 rounded-full bg-canvas-night/80 border border-hairline-dark text-[9px] text-on-primary font-mono backdrop-blur-xs">
            {kind === "image" ? "ФОТО" : kind === "video" ? "ВІДЕО" : kind === "audio" ? "АУДІО" : "ДОКУМЕНТ"}
          </span>
        </div>

        {/* Caption */}
        {item.caption && (
          <p className="text-on-primary text-xs sm:text-sm p-3.5 pb-2 line-clamp-2 leading-relaxed font-medium group-hover:text-white transition-colors">
            {stripWikiMarkup(item.caption)}
          </p>
        )}
      </div>

      {/* Footer Info & Like Bar */}
      <div
        className="px-3.5 py-2.5 border-t border-hairline-dark/60 flex items-center justify-between text-xs text-ink-mute"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="font-mono text-[11px]">
          {new Date(item.created_at).toLocaleDateString("uk-UA")}
        </span>

        <div className="flex items-center gap-2">
          <LikeButton
            itemType="media"
            itemId={item.id}
            initialCount={likeCountLocal}
            compact
          />
        </div>
      </div>
    </div>
  );
}

export default function UnifiedArchiveClient({
  initialMedia = [],
  initialPosts = [],
  initialLore = [],
  initialPodcasts = [],
  defaultTab = "all",
  initialFilter = "all",
}: {
  initialMedia?: MediaItem[];
  initialPosts?: PostItem[];
  initialLore?: LoreItem[];
  initialPodcasts?: PodcastEpisodeItem[];
  defaultTab?: ArchiveTab;
  initialFilter?: string;
}) {
  const [activeTab, setActiveTab] = useState<ArchiveTab>(defaultTab);
  const [search, setSearch] = useState("");
  const [mediaFilter, setMediaFilter] = useState<string>(initialFilter);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [limit, setLimit] = useState(24);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("gallery-view") as ViewMode) || "masonry";
    }
    return "masonry";
  });

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("gallery-view", mode);
    }
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!selectedMedia) return;

    const filteredMediaList = initialMedia.filter((m) =>
      mediaFilter === "all" ? true : m.file_type === mediaFilter
    );
    const currentIndex = filteredMediaList.findIndex((m) => m.id === selectedMedia.id);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        if (currentIndex > 0) {
          setSelectedMedia(filteredMediaList[currentIndex - 1]);
        }
      } else if (e.key === "ArrowRight") {
        if (currentIndex < filteredMediaList.length - 1) {
          setSelectedMedia(filteredMediaList[currentIndex + 1]);
        }
      } else if (e.key === "Escape") {
        setSelectedMedia(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMedia, initialMedia, mediaFilter]);

  const handlePrevMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedMedia) return;
    const filteredMediaList = initialMedia.filter((m) =>
      mediaFilter === "all" ? true : m.file_type === mediaFilter
    );
    const currentIndex = filteredMediaList.findIndex((m) => m.id === selectedMedia.id);
    if (currentIndex > 0) {
      setSelectedMedia(filteredMediaList[currentIndex - 1]);
    }
  };

  const handleNextMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedMedia) return;
    const filteredMediaList = initialMedia.filter((m) =>
      mediaFilter === "all" ? true : m.file_type === mediaFilter
    );
    const currentIndex = filteredMediaList.findIndex((m) => m.id === selectedMedia.id);
    if (currentIndex < filteredMediaList.length - 1) {
      setSelectedMedia(filteredMediaList[currentIndex + 1]);
    }
  };

  const handleCopyLink = (e: React.MouseEvent, id: string, type: "gallery" | "blog" | "lore" | "cast") => {
    e.stopPropagation();
    const url = `${window.location.origin}/${type}/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Filtered datasets
  const filteredMedia = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialMedia.filter((m) => {
      const matchesType = mediaFilter === "all" || m.file_type === mediaFilter;
      const matchesSearch = !q || (m.caption && m.caption.toLowerCase().includes(q));
      return matchesType && matchesSearch;
    });
  }, [initialMedia, mediaFilter, search]);

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialPosts.filter((p) => {
      const matchesTag = !selectedTag || (p.tags && p.tags.includes(selectedTag));
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)));
      return matchesTag && matchesSearch;
    });
  }, [initialPosts, selectedTag, search]);

  const filteredLore = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialLore.filter((item) => {
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q));
      return matchesSearch;
    });
  }, [initialLore, search]);

  const filteredPodcasts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialPodcasts.filter((ep) => {
      return (
        !q ||
        ep.title.toLowerCase().includes(q) ||
        ep.description.toLowerCase().includes(q)
      );
    });
  }, [initialPodcasts, search]);

  // Mixed Unified Feed with strict deduplication
  const unifiedFeed = useMemo(() => {
    const items: Array<
      | { id: string; type: "media"; date: number; data: MediaItem }
      | { id: string; type: "post"; date: number; data: PostItem }
      | { id: string; type: "lore"; date: number; data: LoreItem }
      | { id: string; type: "podcast"; date: number; data: PodcastEpisodeItem }
    > = [];
    const seenMediaIds = new Set<string>();

    filteredLore.forEach((l) => {
      if (l.media_id) seenMediaIds.add(l.media_id);
      items.push({ id: `lore-${l.id}`, type: "lore", date: new Date(l.created_at).getTime(), data: l });
    });

    filteredMedia.forEach((m) => {
      if (!seenMediaIds.has(m.id)) {
        seenMediaIds.add(m.id);
        items.push({ id: `media-${m.id}`, type: "media", date: new Date(m.created_at).getTime(), data: m });
      }
    });

    filteredPosts.forEach((p) => {
      items.push({ id: `post-${p.id}`, type: "post", date: new Date(p.created_at).getTime(), data: p });
    });

    filteredPodcasts.forEach((ep) => {
      items.push({ id: `podcast-${ep.id}`, type: "podcast", date: new Date(ep.created_at).getTime(), data: ep });
    });

    return items.sort((a, b) => b.date - a.date).slice(0, limit);
  }, [filteredMedia, filteredPosts, filteredLore, filteredPodcasts, limit]);

  const totalAllItems = initialMedia.length + initialPosts.length + initialLore.length + initialPodcasts.length;

  const currentMediaIndex = selectedMedia
    ? filteredMedia.findIndex((m) => m.id === selectedMedia.id)
    : -1;
  const hasPrevMedia = currentMediaIndex > 0;
  const hasNextMedia = currentMediaIndex !== -1 && currentMediaIndex < filteredMedia.length - 1;

  const visibleMedia = useMemo(() => filteredMedia.slice(0, limit), [filteredMedia, limit]);
  const selectedMediaKind = selectedMedia ? getFileKind(selectedMedia.file_url, selectedMedia.file_type) : null;

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto space-y-8">
        {/* Header Hero */}
        <div className="card-dark p-6 sm:p-10 rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h1 className="heading-hero !text-3xl sm:!text-5xl">
              АРХІВ <span className="text-on-primary-mute">КОНТЕНТУ</span>
            </h1>

            <Link href="/upload" className="btn-solid !py-2 !px-4 !text-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              ЗАВАНТАЖИТИ МАТЕРІАЛ
            </Link>
          </div>

          <p className="text-on-primary-mute text-base max-w-2xl leading-relaxed mb-6">
            Єдиний цифровий каталог творчості кодла: медіафайли, дописи блогу, артефакти та випуски подкасту КодлоCAST.
          </p>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-hairline-dark">
            {[
              { label: "УСЬОГО МАТЕРІАЛІВ", value: totalAllItems },
              { label: "МЕДІАТЕКА", value: initialMedia.length },
              { label: "ДОПИСИ БЛОГУ", value: initialPosts.length },
              { label: "АРТЕФАКТИ ТА ЛОР", value: initialLore.length },
            ].map((stat) => (
              <div key={stat.label} className="p-3.5 rounded-xl bg-canvas-night border border-hairline-dark/60">
                <p className="heading-sub !text-xl text-on-primary font-mono">{stat.value}</p>
                <p className="micro-cap text-ink-mute mt-1 text-[10px]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Primary Tab Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0">
              {[
                { key: "all", label: `УСЕ (${totalAllItems})` },
                { key: "media", label: `МЕДІА (${initialMedia.length})` },
                { key: "posts", label: `БЛОГ (${initialPosts.length})` },
                { key: "lore", label: `АРТЕФАКТИ (${initialLore.length})` },
                { key: "podcasts", label: `КАСТ (${initialPodcasts.length})` },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    setActiveTab(t.key as ArchiveTab);
                    setLimit(24);
                  }}
                  className={`button-cap px-4 py-2 rounded-full text-xs transition-colors shrink-0 cursor-pointer ${
                    activeTab === t.key
                      ? "bg-on-primary text-ink font-bold"
                      : "border border-hairline-dark text-on-primary-mute hover:text-on-primary hover:bg-canvas-night-soft"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Шукати в архіві..."
                className="w-full bg-canvas-night border border-hairline-dark rounded-full px-4 py-2 pl-9 text-xs text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-white/40"
              />
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-on-primary text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Subfilters */}
          {activeTab === "media" && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                {[
                  { key: "all", label: "ВСЕ" },
                  { key: "image", label: "ФОТО" },
                  { key: "video", label: "ВІДЕО" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setMediaFilter(f.key)}
                    className={`button-cap px-3.5 py-1.5 rounded-full text-xs transition-colors shrink-0 cursor-pointer ${
                      mediaFilter === f.key
                        ? "bg-on-primary text-ink font-bold"
                        : "border border-hairline-dark text-on-primary-mute hover:text-on-primary hover:bg-canvas-night-soft"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center gap-1 bg-canvas-night border border-hairline-dark rounded-full p-1">
                {VIEW_MODES.map((vm) => (
                  <button
                    key={vm.key}
                    onClick={() => handleViewChange(vm.key)}
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                      viewMode === vm.key
                        ? "bg-white/15 text-on-primary"
                        : "text-ink-mute hover:text-on-primary"
                    }`}
                    title={vm.label}
                  >
                    {vm.icon}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab Content 1: Unified Stream (All) */}
        {activeTab === "all" && (
          unifiedFeed.length === 0 ? (
            <EmptyState message="Матеріалів не знайдено" />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
                {unifiedFeed.map((item) => {
                  if (item.type === "media") {
                    const m = item.data as MediaItem;
                    return (
                      <MediaCardItem
                        key={`media-${m.id}`}
                        item={m}
                        viewMode="grid"
                        onClick={() => setSelectedMedia(m)}
                      />
                    );
                  }

                  if (item.type === "post") {
                    const p = item.data as PostItem;
                    return (
                      <Link
                        key={`post-${p.id}`}
                        href={`/blog/${p.id}`}
                        className="card-dark p-6 rounded-xl hover:border-white/30 transition-all group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="micro-cap px-2.5 py-0.5 rounded-full bg-canvas-night border border-hairline-dark text-[10px] text-ink-mute font-mono">
                              БЛОГ
                            </span>
                            <span className="text-xs text-ink-mute font-mono">
                              {new Date(p.created_at).toLocaleDateString("uk-UA")}
                            </span>
                          </div>

                          <h3 className="font-bold text-on-primary text-lg mb-2 group-hover:text-white transition-colors line-clamp-2">
                            {p.title}
                          </h3>

                          <p className="text-on-primary-mute text-sm line-clamp-3 leading-relaxed mb-4">
                            {stripWikiMarkup(p.content).slice(0, 150)}
                          </p>

                          {p.tags && p.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {p.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="micro-cap text-[9px] px-2 py-0.5 rounded-full bg-canvas-night border border-hairline-dark text-ink-mute">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-hairline-dark flex items-center justify-between text-xs text-ink-mute">
                          <span>{p.profiles?.display_name || "Кодло"}</span>
                          <span className="group-hover:text-on-primary transition-colors">Читати →</span>
                        </div>
                      </Link>
                    );
                  }

                  if (item.type === "lore") {
                    const l = item.data as LoreItem;
                    const docName = l.media?.caption || (l.media?.file_url ? l.media.file_url.split("/").pop() : null);
                    const docKind = l.media?.file_url ? getFileKind(l.media.file_url, l.media.file_type) : null;
                    return (
                      <Link
                        key={`lore-${l.id}`}
                        href={`/lore/${l.id}`}
                        className="card-dark p-6 rounded-xl hover:border-white/30 transition-all group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="button-cap px-2.5 py-0.5 rounded-full bg-canvas-night border border-hairline-dark text-[10px] text-ink-mute font-mono uppercase">
                              АРТЕФАКТИ
                            </span>
                            <span className="text-xs text-ink-mute font-mono">
                              {new Date(l.created_at).toLocaleDateString("uk-UA")}
                            </span>
                          </div>

                          <h3 className="font-bold text-on-primary text-lg mb-2 group-hover:text-white transition-colors line-clamp-2">
                            {l.title}
                          </h3>

                          {docKind === "audio" && l.media ? (
                            <div className="my-3 p-3 rounded-lg bg-canvas-night border border-hairline-dark/60 flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full bg-white/[0.08] text-on-primary border border-hairline-dark flex items-center justify-center shrink-0">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                  <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                              </span>
                              <span className="text-xs font-mono text-on-primary truncate font-semibold">
                                {docName || "Аудіозапис"}
                              </span>
                            </div>
                          ) : docName ? (
                            <p className="text-on-primary-mute text-xs line-clamp-2 leading-relaxed mb-4 font-mono">
                              Документ: {docName}
                            </p>
                          ) : l.description ? (
                            <p className="text-on-primary-mute text-sm line-clamp-3 leading-relaxed mb-4">
                              {stripWikiMarkup(l.description)}
                            </p>
                          ) : null}
                        </div>

                        <div className="pt-3 border-t border-hairline-dark flex items-center justify-between text-xs text-ink-mute">
                          <div className="flex items-center gap-2">
                            <Avatar src={l.profiles?.avatar_url} displayName={l.profiles?.display_name || "Кодло"} size={18} />
                            <span>{l.profiles?.display_name || "Кодло"}</span>
                          </div>
                          <span className="group-hover:text-on-primary transition-colors">Переглянути →</span>
                        </div>
                      </Link>
                    );
                  }

                  if (item.type === "podcast") {
                    const ep = item.data as PodcastEpisodeItem;
                    return (
                      <div
                        key={`podcast-${ep.id}`}
                        className="card-dark p-6 rounded-xl hover:border-white/30 transition-all group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="micro-cap px-2.5 py-0.5 rounded-full bg-canvas-night border border-hairline-dark text-[10px] text-ink-mute font-mono">
                              КАСТ #{ep.episode_number}
                            </span>
                            <span className="text-xs text-ink-mute font-mono">
                              {new Date(ep.created_at).toLocaleDateString("uk-UA")}
                            </span>
                          </div>

                          <h3 className="font-bold text-on-primary text-lg mb-2 group-hover:text-white transition-colors">
                            {ep.title}
                          </h3>

                          <p className="text-on-primary-mute text-xs line-clamp-2 leading-relaxed mb-3">
                            {stripWikiMarkup(ep.description)}
                          </p>

                          <audio controls src={ep.audio_url} className="w-full my-2 h-8" />
                        </div>

                        <div className="pt-3 border-t border-hairline-dark flex items-center justify-between text-xs text-ink-mute">
                          <Link href={`/cast/${ep.id}`} className="hover:underline text-on-primary">
                            Сторінка випуску →
                          </Link>
                          <span>{Math.round(ep.duration / 60)} хв</span>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>

              {unifiedFeed.length >= limit && (
                <div className="flex justify-center pt-6">
                  <button
                    onClick={() => setLimit((prev) => prev + 24)}
                    className="btn-ghost text-on-primary cursor-pointer !py-2.5 !px-8"
                  >
                    ПОКАЗАТИ ЩЕ
                  </button>
                </div>
              )}
            </div>
          )
        )}

        {/* Tab Content 2: Media (Photos & Videos) */}
        {activeTab === "media" && (
          filteredMedia.length === 0 ? (
            <EmptyState message="Медіафайлів не знайдено" />
          ) : (
            <>
              {viewMode === "masonry" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                  {visibleMedia.map((m) => (
                    <MediaCardItem
                      key={m.id}
                      item={m}
                      viewMode="masonry"
                      onClick={() => setSelectedMedia(m)}
                    />
                  ))}
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {visibleMedia.map((m) => (
                    <MediaCardItem
                      key={m.id}
                      item={m}
                      viewMode="grid"
                      onClick={() => setSelectedMedia(m)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {visibleMedia.map((m) => (
                    <MediaCardItem
                      key={m.id}
                      item={m}
                      viewMode="list"
                      onClick={() => setSelectedMedia(m)}
                    />
                  ))}
                </div>
              )}

              {filteredMedia.length > limit && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={() => setLimit((prev) => prev + 24)}
                    className="btn-ghost text-on-primary cursor-pointer !py-2.5 !px-8"
                  >
                    ПОКАЗАТИ ЩЕ ({filteredMedia.length - limit})
                  </button>
                </div>
              )}
            </>
          )
        )}

        {/* Tab Content 3: Blog Posts */}
        {activeTab === "posts" && (
          filteredPosts.length === 0 ? (
            <EmptyState message="Дописів не знайдено" />
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.id}`}
                  className="card-dark p-6 rounded-xl block hover:border-white/30 transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <h3 className="font-bold text-on-primary text-xl group-hover:text-white transition-colors">
                      {post.title}
                    </h3>
                    <span className="text-xs text-ink-mute font-mono shrink-0">
                      {new Date(post.created_at).toLocaleDateString("uk-UA")}
                    </span>
                  </div>

                  <p className="text-on-primary-mute text-sm line-clamp-3 leading-relaxed mb-4">
                    {stripWikiMarkup(post.content).slice(0, 240)}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-hairline-dark text-xs text-ink-mute">
                    <div className="flex items-center gap-2">
                      <Avatar src={post.profiles?.avatar_url} displayName={post.profiles?.display_name || "Кодло"} size={20} />
                      <span>{post.profiles?.display_name || "Кодло"}</span>
                    </div>

                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {post.tags.map((tag) => (
                          <span key={tag} className="micro-cap text-[9px] px-2 py-0.5 rounded-full bg-canvas-night border border-hairline-dark text-ink-mute">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* Tab Content 4: Artifacts / Lore */}
        {activeTab === "lore" && (
          filteredLore.length === 0 ? (
            <EmptyState message="Артефактів не знайдено" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredLore.map((item) => {
                const docName = item.media?.caption || (item.media?.file_url ? item.media.file_url.split("/").pop() : null);
                const docKind = item.media?.file_url ? getFileKind(item.media.file_url, item.media.file_type) : null;
                return (
                  <Link
                    key={item.id}
                    href={`/lore/${item.id}`}
                    className="card-dark p-6 rounded-xl hover:border-white/30 transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="button-cap px-2.5 py-0.5 rounded-full bg-canvas-night border border-hairline-dark text-[10px] text-ink-mute font-mono uppercase">
                          АРТЕФАКТИ
                        </span>
                        <span className="text-xs text-ink-mute font-mono">
                          {new Date(item.created_at).toLocaleDateString("uk-UA")}
                        </span>
                      </div>

                      <h3 className="font-bold text-on-primary text-xl mb-2 group-hover:text-white transition-colors line-clamp-2">
                        {item.title}
                      </h3>

                      {docKind === "audio" && item.media ? (
                        <div className="my-4 p-3.5 rounded-xl bg-canvas-night border border-hairline-dark/60 flex items-center gap-3">
                          <span className="w-9 h-9 rounded-full bg-white/[0.08] text-on-primary border border-hairline-dark flex items-center justify-center shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-mono text-on-primary truncate font-bold">{docName || "Аудіозапис"}</p>
                            <p className="text-[10px] text-ink-mute font-mono">АУДІО ТРЕК</p>
                          </div>
                        </div>
                      ) : docName ? (
                        <p className="text-on-primary-mute text-xs line-clamp-2 leading-relaxed mb-6 font-mono">
                          Документ: {docName}
                        </p>
                      ) : item.description ? (
                        <p className="text-on-primary-mute text-sm line-clamp-3 leading-relaxed mb-6">
                          {stripWikiMarkup(item.description)}
                        </p>
                      ) : null}
                    </div>

                    <div className="pt-3 border-t border-hairline-dark flex items-center justify-between text-xs text-ink-mute">
                      <div className="flex items-center gap-2">
                        <Avatar src={item.profiles?.avatar_url} displayName={item.profiles?.display_name || "Кодло"} size={20} />
                        <span>{item.profiles?.display_name || "Кодло"}</span>
                      </div>
                      <span className="group-hover:text-on-primary transition-colors">Деталі →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        )}

        {/* Tab Content 5: Podcasts (Cast) */}
        {activeTab === "podcasts" && (
          filteredPodcasts.length === 0 ? (
            <EmptyState message="Випусків подкасту не знайдено" />
          ) : (
            <div className="space-y-4">
              {filteredPodcasts.map((ep) => (
                <div
                  key={ep.id}
                  className="card-dark p-6 rounded-xl hover:border-white/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="micro-cap px-2.5 py-0.5 rounded-full bg-canvas-night border border-hairline-dark text-[10px] text-ink-mute font-mono">
                        ВИПУСК #{ep.episode_number}
                      </span>
                      <span className="text-xs text-ink-mute font-mono">
                        {new Date(ep.created_at).toLocaleDateString("uk-UA")}
                      </span>
                    </div>

                    <h3 className="font-bold text-on-primary text-xl mb-2 group-hover:text-white transition-colors">
                      {ep.title}
                    </h3>

                    <p className="text-on-primary-mute text-sm leading-relaxed mb-4">
                      {stripWikiMarkup(ep.description)}
                    </p>

                    <audio controls src={ep.audio_url} className="w-full my-3" />
                  </div>

                  <div className="pt-3 border-t border-hairline-dark flex items-center justify-between text-xs text-ink-mute">
                    <Link href={`/cast/${ep.id}`} className="text-on-primary hover:underline">
                      Сторінка випуску →
                    </Link>
                    <span>{Math.round(ep.duration / 60)} хвилин</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Lightbox Modal with Pure Monochrome Styling */}
      <Modal
        isOpen={!!selectedMedia}
        onClose={() => setSelectedMedia(null)}
        overlayClassName="bg-canvas-night/95"
        className="max-w-5xl max-h-[95vh] overflow-auto border-none shadow-none bg-transparent p-0 relative"
      >
        {selectedMedia && (
          <div onClick={(e) => e.stopPropagation()} className="relative">
            {/* Prev / Next Buttons */}
            {hasPrevMedia && (
              <button
                onClick={handlePrevMedia}
                className="hidden md:flex fixed left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-canvas-night/80 border border-hairline-dark items-center justify-center text-on-primary hover:border-white transition-colors z-50 cursor-pointer"
                title="Попереднє (←)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}

            {hasNextMedia && (
              <button
                onClick={handleNextMedia}
                className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-canvas-night/80 border border-hairline-dark items-center justify-center text-on-primary hover:border-white transition-colors z-50 cursor-pointer"
                title="Наступне (→)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )}

            {/* Multimedia Content Area */}
            <div className="text-center">
              {selectedMediaKind === "image" ? (
                <Image
                  src={selectedMedia.file_url}
                  alt={selectedMedia.caption || "Медіа"}
                  width={1200}
                  height={900}
                  className="max-w-full max-h-[80vh] object-contain rounded-xl mx-auto shadow-2xl"
                  sizes="100vw"
                  priority
                />
              ) : selectedMediaKind === "video" ? (
                <video
                  src={selectedMedia.file_url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[80vh] rounded-xl mx-auto shadow-2xl"
                />
              ) : selectedMediaKind === "audio" ? (
                <div className="card-dark p-8 rounded-2xl max-w-xl mx-auto text-center space-y-6 shadow-2xl border border-hairline-dark">
                  <div className="w-24 h-24 rounded-full bg-canvas-night border border-hairline-dark flex items-center justify-center mx-auto text-on-primary shadow-[0_0_40px_rgba(255,255,255,0.06)]">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>

                  <div>
                    <p className="micro-cap text-ink-mute mb-1">АУДІОЗАПИС АРХІВУ</p>
                    <h3 className="font-bold text-on-primary text-xl truncate px-4">
                      {selectedMedia.caption || selectedMedia.file_url.split("/").pop()}
                    </h3>
                  </div>

                  <audio src={selectedMedia.file_url} controls autoPlay className="w-full" />
                </div>
              ) : selectedMediaKind === "text" ? (
                <MarkdownTextFileViewer url={selectedMedia.file_url} />
              ) : selectedMediaKind === "pdf" ? (
                <iframe src={selectedMedia.file_url} className="w-full h-[70vh] rounded-xl border border-hairline-dark" />
              ) : (
                <div className="card-dark p-8 rounded-2xl max-w-md mx-auto text-center">
                  <p className="text-on-primary font-medium mb-3">Документ/файл</p>
                  <a href={selectedMedia.file_url} download className="btn-solid !py-2 !px-6 text-xs">
                    ЗАВАНТАЖИТИ ФАЙЛ
                  </a>
                </div>
              )}
            </div>

            {/* Lightbox Controls Card */}
            <div className="card-dark p-5 rounded-xl mt-4 max-w-2xl mx-auto">
              {selectedMedia.caption && (
                <p className="text-on-primary text-center font-medium mb-3 text-base">
                  {stripWikiMarkup(selectedMedia.caption)}
                </p>
              )}

              {selectedMedia.profiles && (
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Avatar src={selectedMedia.profiles.avatar_url} displayName={selectedMedia.profiles.display_name} size={22} />
                  <span className="text-ink-mute micro-cap text-xs">
                    {selectedMedia.profiles.display_name}
                  </span>
                  <span className="text-hairline-dark">•</span>
                  <span className="text-xs text-ink-mute font-mono">
                    {new Date(selectedMedia.created_at).toLocaleDateString("uk-UA")}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap justify-center items-center gap-3 pt-3 border-t border-hairline-dark">
                <LikeButton itemType="media" itemId={selectedMedia.id} initialCount={selectedMedia.like_count || 0} />

                <button
                  onClick={(e) => handleCopyLink(e, selectedMedia.id, "gallery")}
                  className="button-cap px-3 py-1.5 rounded-full border border-hairline-dark text-xs text-on-primary-mute hover:text-on-primary hover:border-white transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <span>{copied ? "СКОПІЙОВАНО!" : "ПОСИЛАННЯ"}</span>
                </button>

                <a
                  href={selectedMedia.file_url}
                  download
                  className="button-cap px-3 py-1.5 rounded-full border border-hairline-dark text-xs text-on-primary-mute hover:text-on-primary hover:border-white transition-colors flex items-center gap-1.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>ЗАВАНТАЖИТИ</span>
                </a>
              </div>

              <div className="mt-4 pt-4 border-t border-hairline-dark">
                <MediaComments mediaId={selectedMedia.id} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      <style jsx global>{`
        @keyframes heartPop {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          30% {
            opacity: 1;
            transform: scale(1.3);
          }
          60% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.4) translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
}
