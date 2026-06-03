"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";

interface GalleryImage {
  id: string;
  file_url: string;
  caption: string | null;
  created_at: string;
}

export default function ImagePicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, caption?: string) => void;
}) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const q = search ? `&q=${encodeURIComponent(search)}` : "";
    fetch(`/api/wiki/images?limit=30${q}`)
      .then((res) => res.json())
      .then((data) => {
        setImages(data.images || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, search]);

  return (
    <Modal isOpen={open} onClose={onClose}>
      <div className="p-4">
        <h3 className="button-cap text-on-primary mb-4">ОБРАТИ ЗОБРАЖЕННЯ</h3>
        <input
          type="text"
          placeholder="ШУКАТИ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 bg-canvas-night border border-hairline-dark rounded text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute text-sm mb-4"
        />
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-on-primary border-t-transparent rounded-full" />
          </div>
        ) : images.length === 0 ? (
          <p className="text-ink-mute text-sm text-center py-8">Зображень не знайдено</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-auto">
            {images.map((img) => (
              <button
                key={img.id}
                onClick={() => {
                  onSelect(img.file_url, img.caption || undefined);
                  onClose();
                }}
                className="aspect-square rounded overflow-hidden border border-hairline-dark hover:border-on-primary transition-colors cursor-pointer bg-canvas-night"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.file_url}
                  alt={img.caption || ""}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
