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

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="micro-cap text-ink-mute mb-2">КОНТЕНТ КОДЛА</p>
          <h1 className="heading-section mb-4">ГАЛЕРЕЯ</h1>

          {/* Filters + View modes */}
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex gap-4">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => handleFilterChange(f.key)}
                  className={`button-cap px-4 py-2 rounded-full border transition-opacity ${
                    filter === f.key
                      ? "border-on-primary text-on-primary"
                      : "border-hairline-dark text-ink-mute hover:text-on-primary"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex gap-1 border border-hairline-dark rounded-lg p-1">
              {VIEW_MODES.map((vm) => (
                <button
                  key={vm.key}
                  onClick={() => handleViewChange(vm.key)}
                  className={`p-1.5 rounded transition-colors ${
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
                  className={`group cursor-pointer rounded-lg overflow-hidden bg-canvas-night-soft border border-hairline-dark hover:border-on-primary-mute transition-colors relative ${
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
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="text-ink-mute">
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
                        <p className="text-xs text-ink-mute mt-0.5">
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
                            <div className="w-12 h-12 rounded-full bg-canvas-night/70 border border-hairline-dark flex items-center justify-center">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="text-on-primary" className="ml-1">
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
                        <Link
                          href={`/gallery/${item.id}`}
                          className="text-ink-mute hover:text-on-primary transition-colors"
                          title="Відкрити на сторінці"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </a>
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
                  className="btn-ghost text-on-primary"
                >
                  ПОКАЗАТИ ЩЕ
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox Modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        overlayClassName="bg-canvas-night/95"
        className="max-w-4xl max-h-[90vh] overflow-auto border-none shadow-none bg-transparent p-0"
      >
        {selected && (
          <div onClick={(e) => e.stopPropagation()}>
            {selected.file_type === "image" ? (
              <Image
                src={selected.file_url}
                alt={selected.caption || "Медіа"}
                width={1200}
                height={900}
                className="max-w-full max-h-[85vh] object-contain rounded-lg mx-auto"
                sizes="100vw"
                priority
              />
            ) : selected.file_type === "video" ? (
              <video
                src={selected.file_url}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] rounded-lg mx-auto"
              />
            ) : null}

            {selected.caption && (
              <p className="text-on-primary-mute text-center mt-4">
                {selected.caption}
              </p>
            )}
            {selected.profiles && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <Avatar src={selected.profiles.avatar_url} displayName={selected.profiles.display_name} size={20} />
                <span className="text-ink-mute micro-cap">
                  {selected.profiles.display_name}
                </span>
              </div>
            )}
            <div className="flex justify-center items-center gap-4 mt-4">
              <LikeButton itemType="media" itemId={selected.id} initialCount={selected.like_count || 0} />
              <Link
                href={`/gallery/${selected.id}`}
                className="text-ink-mute hover:text-on-primary transition-colors"
                title="Поділитися"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </Link>
              <a
                href={selected.file_url}
                download
                className="text-ink-mute hover:text-on-primary transition-colors"
                title="Завантажити"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </a>
            </div>
            <MediaComments mediaId={selected.id} />
          </div>
        )}
      </Modal>
    </div>
  );
}
