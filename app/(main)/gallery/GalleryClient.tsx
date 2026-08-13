"use client";

import { useState, useEffect, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LikeButton from "@/components/ui/LikeButton";
import MediaComments from "@/components/ui/MediaComments";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";

interface Media {
  id: string;
  file_url: string;
  file_type: string;
  caption: string | null;
  created_at: string;
  author_id: string;
  like_count?: number;
  profiles?: { display_name: string; username: string; avatar_url: string | null } | null;
}

type ViewMode = "masonry" | "grid" | "list";

const VIEW_MODES: { key: ViewMode; label: string; icon: ReactNode }[] = [
  {
    key: "masonry",
    label: "МАСОНРІ",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="0" y="0" width="6" height="8" rx="1" />
        <rect x="8" y="0" width="8" height="5" rx="1" />
        <rect x="0" y="10" width="8" height="6" rx="1" />
        <rect x="10" y="7" width="6" height="9" rx="1" />
      </svg>
    ),
  },
  {
    key: "grid",
    label: "СІТКА",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="0" y="0" width="7" height="7" rx="1" />
        <rect x="9" y="0" width="7" height="7" rx="1" />
        <rect x="0" y="9" width="7" height="7" rx="1" />
        <rect x="9" y="9" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    key: "list",
    label: "СПИСОК",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="0" y="0" width="16" height="3" rx="1" />
        <rect x="0" y="5" width="16" height="3" rx="1" />
        <rect x="0" y="10" width="16" height="3" rx="1" />
      </svg>
    ),
  },
];

export default function GalleryClient({
  initialMedia,
  initialFilter,
}: {
  initialMedia: Media[];
  initialFilter: string;
}) {
  const router = useRouter();

  const [filter, setFilter] = useState<string>(initialFilter);
  const [limit, setLimit] = useState(24);
  const [selected, setSelected] = useState<Media | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("gallery-view") as ViewMode) || "masonry";
    }
    return "masonry";
  });

  useEffect(() => {
    setFilter(initialFilter);
    setLimit(24);
  }, [initialFilter]);

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("gallery-view", mode);
  };

  const filters = [
    { key: "all", label: "ВСЕ" },
    { key: "image", label: "ФОТО" },
    { key: "video", label: "ВІДЕО" },
  ];

  const handleFilterChange = (key: string) => {
    setFilter(key);
    setLimit(24);
    router.push(`/gallery?filter=${key}`, { scroll: false });
  };

  const filteredMedia = filter === "all" ? initialMedia : initialMedia.filter(m => m.file_type === filter);
  const paginatedMedia = filteredMedia.slice(0, limit);

  const gridClass =
    viewMode === "masonry"
      ? "columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4"
      : viewMode === "grid"
        ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        : "flex flex-col gap-3";

  const [copied, setCopied] = useState(false);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!selected) return;

    const currentIndex = filteredMedia.findIndex((m) => m.id === selected.id);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        if (currentIndex > 0) {
          setSelected(filteredMedia[currentIndex - 1]);
        }
      } else if (e.key === "ArrowRight") {
        if (currentIndex < filteredMedia.length - 1) {
          setSelected(filteredMedia[currentIndex + 1]);
        }
      } else if (e.key === "Escape") {
        setSelected(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, filteredMedia]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selected) return;
    const currentIndex = filteredMedia.findIndex((m) => m.id === selected.id);
    if (currentIndex > 0) {
      setSelected(filteredMedia[currentIndex - 1]);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selected) return;
    const currentIndex = filteredMedia.findIndex((m) => m.id === selected.id);
    if (currentIndex < filteredMedia.length - 1) {
      setSelected(filteredMedia[currentIndex + 1]);
    }
  };

  const handleCopyLink = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/gallery/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const selectedIndex = selected ? filteredMedia.findIndex((m) => m.id === selected.id) : -1;
  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex !== -1 && selectedIndex < filteredMedia.length - 1;

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="micro-cap text-ink-mute mb-2">KODLOHUB 2.0 · МЕДІАТЕКА</p>
          <h1 className="heading-section mb-4">ГАЛЕРЕЯ</h1>
          <p className="text-on-primary-mute text-sm max-w-xl">
            Повний архів фотографій, відеозаписів та документів кодла. Переглядайте та завантажуйте контент.
          </p>

          {/* Filters + View modes */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-8">
            <div className="flex gap-2">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => handleFilterChange(f.key)}
                  className={`button-cap px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    filter === f.key
                      ? "bg-on-primary text-ink font-bold"
                      : "border border-hairline-dark text-on-primary-mute hover:text-on-primary hover:bg-canvas-night-soft"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex gap-1 border border-hairline-dark rounded-lg p-1 bg-canvas-night-soft/60">
              {VIEW_MODES.map((vm) => (
                <button
                  key={vm.key}
                  onClick={() => handleViewChange(vm.key)}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    viewMode === vm.key
                      ? "bg-on-primary/10 text-on-primary"
                      : "text-ink-mute hover:text-on-primary"
                  }`}
                  title={vm.label}
                >
                  {vm.icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gallery grid */}
        {filteredMedia.length === 0 ? (
          <EmptyState message="тут поки нічого" />
        ) : (
          <>
            <div className={gridClass}>
              {paginatedMedia.map((item) => (
                <div
                  key={item.id}
                  className={`group cursor-pointer rounded-xl overflow-hidden bg-canvas-night-soft border border-hairline-dark hover:border-on-primary-mute transition-all relative ${
                    viewMode === "masonry" ? "break-inside-avoid" : ""
                  } ${viewMode === "list" ? "flex items-center" : ""}`}
                  onClick={() => setSelected(item)}
                >
                  {viewMode === "list" ? (
                    <>
                      <div className="w-20 h-20 shrink-0 overflow-hidden">
                        {item.file_type === "image" ? (
                          <Image
                            src={item.file_url}
                            alt={item.caption || "Медіа"}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : item.file_type === "video" ? (
                          <div className="w-full h-full bg-canvas-night flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-ink-mute">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-canvas-night-soft flex items-center justify-center">
                            <p className="micro-cap text-ink-mute text-[8px]">ДОК</p>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 px-3 py-2">
                        <p className="text-sm text-on-primary truncate">{item.caption || "Без назви"}</p>
                        <p className="text-xs text-ink-mute mt-0.5 font-mono">
                          {item.file_type === "image" ? "Фото" : item.file_type === "video" ? "Відео" : "Документ"}
                          {" · "}
                          {new Date(item.created_at).toLocaleDateString("uk-UA")}
                        </p>
                      </div>
                      <div className="pr-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <LikeButton itemType="media" itemId={item.id} initialCount={item.like_count || 0} compact />
                      </div>
                    </>
                  ) : (
                    <>
                      {item.file_type === "image" ? (
                        <div className="relative w-full">
                          <Image
                            src={item.file_url}
                            alt={item.caption || "Медіа"}
                            width={400}
                            height={300}
                            className={`w-full transition-transform duration-300 group-hover:scale-105 ${
                              viewMode === "grid" ? "h-48 object-cover" : "h-auto"
                            }`}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            loading="lazy"
                          />
                        </div>
                      ) : item.file_type === "video" ? (
                        <div className="relative w-full">
                          <video
                            src={item.file_url}
                            className={`w-full ${viewMode === "grid" ? "h-48 object-cover" : "h-auto"}`}
                            preload="metadata"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-canvas-night/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-12 h-12 rounded-full bg-canvas-night/70 border border-hairline-dark flex items-center justify-center text-on-primary">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
                                <polygon points="5 3 19 12 5 21 5 3" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center">
                          <p className="micro-cap text-ink-mute">ДОКУМЕНТ</p>
                        </div>
                      )}

                      {item.caption && (
                        <div className="bg-canvas-night/80 p-3">
                          <p className="caption text-on-primary-mute">
                            {item.caption}
                          </p>
                        </div>
                      )}
                      <div className="bg-canvas-night/80 px-3 py-2 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                        <LikeButton itemType="media" itemId={item.id} initialCount={item.like_count || 0} compact />
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/gallery/${item.id}`}
                            className="text-ink-mute hover:text-on-primary transition-colors"
                            title="Відкрити на сторінці"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </Link>
                          <a
                            href={item.file_url}
                            download
                            className="text-ink-mute hover:text-on-primary transition-colors"
                            title="Завантажити"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Load more button */}
            {filteredMedia.length > limit && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={() => setLimit((prev) => prev + 24)}
                  className="btn-ghost text-on-primary cursor-pointer"
                >
                  ПОКАЗАТИ ЩЕ ({filteredMedia.length - limit})
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox Modal with Arrow Navigation */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        overlayClassName="bg-canvas-night/95"
        className="max-w-5xl max-h-[95vh] overflow-auto border-none shadow-none bg-transparent p-0 relative"
      >
        {selected && (
          <div onClick={(e) => e.stopPropagation()} className="relative">
            {/* Desktop Prev / Next Buttons */}
            {hasPrev && (
              <button
                onClick={handlePrev}
                className="hidden md:flex fixed left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-canvas-night/80 border border-hairline-dark items-center justify-center text-on-primary hover:border-on-primary transition-colors z-50 cursor-pointer"
                title="Попереднє (←)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}

            {hasNext && (
              <button
                onClick={handleNext}
                className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-canvas-night/80 border border-hairline-dark items-center justify-center text-on-primary hover:border-on-primary transition-colors z-50 cursor-pointer"
                title="Наступне (→)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )}

            {/* Media Content */}
            <div className="text-center">
              {selected.file_type === "image" ? (
                <Image
                  src={selected.file_url}
                  alt={selected.caption || "Медіа"}
                  width={1200}
                  height={900}
                  className="max-w-full max-h-[80vh] object-contain rounded-xl mx-auto shadow-2xl"
                  sizes="100vw"
                  priority
                />
              ) : selected.file_type === "video" ? (
                <video
                  src={selected.file_url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[80vh] rounded-xl mx-auto shadow-2xl"
                />
              ) : null}
            </div>

            {/* Controls and caption bar */}
            <div className="card-dark p-4 rounded-xl mt-4 max-w-2xl mx-auto">
              {selected.caption && (
                <p className="text-on-primary text-center font-medium mb-3">
                  {selected.caption}
                </p>
              )}

              {selected.profiles && (
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Avatar src={selected.profiles.avatar_url} displayName={selected.profiles.display_name} size={22} />
                  <span className="text-ink-mute micro-cap text-xs">
                    {selected.profiles.display_name}
                  </span>
                  <span className="text-hairline-dark">•</span>
                  <span className="text-xs text-ink-mute font-mono">
                    {new Date(selected.created_at).toLocaleDateString("uk-UA")}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap justify-center items-center gap-4 pt-3 border-t border-hairline-dark">
                <LikeButton itemType="media" itemId={selected.id} initialCount={selected.like_count || 0} />

                <button
                  onClick={(e) => handleCopyLink(e, selected.id)}
                  className="button-cap px-3 py-1.5 rounded-full border border-hairline-dark text-xs text-on-primary-mute hover:text-on-primary hover:border-on-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <span>{copied ? "СКОПІЙОВАНО!" : "ПОСИЛАННЯ"}</span>
                </button>

                <a
                  href={selected.file_url}
                  download
                  className="button-cap px-3 py-1.5 rounded-full border border-hairline-dark text-xs text-on-primary-mute hover:text-on-primary hover:border-on-primary transition-colors flex items-center gap-1.5"
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
                <MediaComments mediaId={selected.id} />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
