"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Media {
  id: string;
  file_url: string;
  file_type: string;
  caption: string;
  created_at: string;
  author_id: string;
}

export default function GalleryPage() {
  const [media, setMedia] = useState<Media[]>([]);
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Media | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function fetchMedia() {
      let query = supabase
        .from("media")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("file_type", filter);
      }

      const { data } = await query;
      setMedia(data || []);
      setLoading(false);
    }

    fetchMedia();
  }, [filter, supabase]);

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="micro-cap text-ink-mute mb-2">КОНТЕНТ КОДЛА</p>
          <h1 className="heading-section mb-4">ГАЛЕРЕЯ</h1>

          {/* Filters */}
          <div className="flex gap-4 mt-6">
            {(["all", "image", "video"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`button-cap px-4 py-2 rounded-full border transition-opacity ${
                  filter === f
                    ? "border-on-primary text-on-primary"
                    : "border-hairline-dark text-ink-mute hover:text-on-primary"
                }`}
              >
                {f === "all" ? "ВСЕ" : f === "image" ? "ФОТО" : "ВІДЕО"}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery grid */}
        {loading ? (
          <div className="text-center py-24">
            <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : media.length === 0 ? (
          <div className="text-center py-24">
            <p className="heading-sub text-hairline-dark mb-4">:(</p>
            <p className="text-on-primary-mute">
              брєдік в чат нє пішем — тут поки нічого
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {media.map((item) => (
              <div
                key={item.id}
                className="break-inside-avoid cursor-pointer group"
                onClick={() => setSelected(item)}
              >
                <div className="relative overflow-hidden rounded-lg bg-canvas-night-soft border border-hairline-dark">
                  {item.file_type === "image" ? (
                    <img
                      src={item.file_url}
                      alt={item.caption || "Фото з кодла"}
                      className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : item.file_type === "video" ? (
                    <video
                      src={item.file_url}
                      className="w-full h-auto"
                      preload="metadata"
                    />
                  ) : (
                    <div className="p-8 text-center">
                      <p className="micro-cap text-ink-mute">ДОКУМЕНТ</p>
                    </div>
                  )}

                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-canvas-night/80 p-3">
                      <p className="caption text-on-primary-mute">
                        {item.caption}
                      </p>
                    </div>
                  )}
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
            className="max-w-5xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {selected.file_type === "image" ? (
              <img
                src={selected.file_url}
                alt={selected.caption || "Фото з кодла"}
                className="max-w-full max-h-[85vh] object-contain mx-auto"
              />
            ) : selected.file_type === "video" ? (
              <video
                src={selected.file_url}
                controls
                className="max-w-full max-h-[85vh] mx-auto"
              />
            ) : null}

            {selected.caption && (
              <p className="text-center text-on-primary-mute mt-4 caption">
                {selected.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
