"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import LikeButton from "@/components/ui/LikeButton";
import MediaComments from "@/components/ui/MediaComments";

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

export default function GalleryItemClient({ item }: { item: Media }) {
  const router = useRouter();

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="micro-cap text-on-primary-mute hover:text-on-primary transition-colors mb-6 inline-block"
        >
          ← НАЗАД
        </button>

        <div className="rounded-lg overflow-hidden bg-canvas-night-soft border border-hairline-dark">
          {item.file_type === "image" ? (
            <Image
              src={item.file_url}
              alt={item.caption || "Медіа"}
              width={1200}
              height={900}
              className="w-full h-auto"
              sizes="100vw"
              priority
            />
          ) : item.file_type === "video" ? (
            <video
              src={item.file_url}
              controls
              autoPlay
              className="w-full h-auto"
            />
          ) : (
            <div className="p-12 text-center">
              <p className="micro-cap text-ink-mute">ДОКУМЕНТ</p>
            </div>
          )}

          <div className="p-4">
            {item.caption && (
              <p className="text-on-primary-mute mb-3">{item.caption}</p>
            )}
            {item.profiles && (
              <p className="caption text-ink-mute mb-3">
                {item.profiles.display_name}
              </p>
            )}
            <div className="flex items-center justify-between">
              <LikeButton itemType="media" itemId={item.id} initialCount={item.like_count || 0} />
            </div>
          </div>
        </div>

        <div className="mt-8">
          <MediaComments mediaId={item.id} />
        </div>
      </div>
    </div>
  );
}
