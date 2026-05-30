"use client";

import { useState } from "react";
import Image from "next/image";
import LikeButton from "@/components/ui/LikeButton";

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

export default function GalleryClient({
  initialMedia,
  initialFilter,
}: {
  initialMedia: Media[];
  initialFilter: string;
}) {
  const [media] = useState<Media[]>(initialMedia);
  const [filter, setFilter] = useState<string>(initialFilter);
  const [selected, setSelected] = useState<Media | null>(null);

  const filters = [
    { key: "all", label: "ВСЕ" },
    { key: "image", label: "ФОТО" },
    { key: "video", label: "ВІДЕО" },
  ];

  const filteredMedia = filter === "all" ? media : media.filter(m => m.file_type === filter);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="micro-cap text-ink-mute mb-2">КОНТЕНТ КОДЛА</p>
          <h1 className="heading-section mb-4">ГАЛЕРЕЯ</h1>

          {/* Filters */}
          <div className="flex gap-4 mt-6">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
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
        </div>

        {/* Gallery grid */}
        {filteredMedia.length === 0 ? (
          <div className="text-center py-24">
            <p className="heading-sub text-hairline-dark mb-4">:(</p>
            <p className="text-on-primary-mute">
              брєдік в чат нє пішем — тут поки нічого
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                className="break-inside-avoid group cursor-pointer rounded-lg overflow-hidden bg-canvas-night-soft border border-hairline-dark hover:border-on-primary-mute transition-colors relative"
                onClick={() => setSelected(item)}
              >
                {item.file_type === "image" ? (
                  <div className="relative w-full">
                    <Image
                      src={item.file_url}
                      alt={item.caption || "Медіа"}
                      width={400}
                      height={300}
                      className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      loading="lazy"
                    />
                  </div>
                ) : item.file_type === "video" ? (
                  <video
                    src={item.file_url}
                    className="w-full h-auto"
                    preload="none"
                  />
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
                <div className="bg-canvas-night/80 px-3 py-2 flex justify-end">
                  <LikeButton itemType="media" itemId={item.id} initialCount={item.like_count || 0} compact />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox modal */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] bg-canvas-night/95 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute top-6 right-6 text-on-primary hover:opacity-70"
            onClick={() => setSelected(null)}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>

          <div
            className="max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {selected.file_type === "image" ? (
              <Image
                src={selected.file_url}
                alt={selected.caption || "Медіа"}
                width={1200}
                height={900}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
                sizes="100vw"
                priority
              />
            ) : selected.file_type === "video" ? (
              <video
                src={selected.file_url}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] rounded-lg"
              />
            ) : null}

            {selected.caption && (
              <p className="text-on-primary-mute text-center mt-4">
                {selected.caption}
              </p>
            )}
            {selected.profiles && (
              <p className="text-ink-mute text-center mt-2 micro-cap">
                {selected.profiles.display_name}
              </p>
            )}
            <div className="flex justify-center mt-4">
              <LikeButton itemType="media" itemId={selected.id} initialCount={selected.like_count || 0} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
