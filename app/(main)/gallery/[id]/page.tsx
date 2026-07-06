import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import GalleryItemClient from "./GalleryItemClient";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

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

const getMediaItem = unstable_cache(
  async (id: string): Promise<Media | null> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("media")
      .select("id, file_url, file_type, caption, created_at, author_id, profiles(display_name, username, avatar_url)")
      .eq("id", id)
      .single();

    if (!data) return null;

    return {
      ...data,
      profiles: (data as any).profiles?.[0] || null,
    } as Media;
  },
  ["gallery-item"],
  { revalidate: 30 }
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await getMediaItem(id);

  if (!item) {
    return { title: "Медіа не знайдено" };
  }

  const typeName = item.file_type === "image" ? "Фото" : item.file_type === "video" ? "Відео" : "Медіа";

  return {
    ...buildPageMetadata({
      title: item.caption || `${typeName} в галереї`,
      description: item.caption || `${typeName} з галереї KodloHUB`,
      path: `/gallery/${item.id}`,
      image: item.file_type === "image" ? item.file_url : undefined,
      video: item.file_type === "video" ? item.file_url : undefined,
    }),
  };
}

export default async function GalleryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getMediaItem(id);

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="heading-sub text-hairline-dark mb-4">:(</p>
          <p className="text-on-primary-mute">медіа не знайдено</p>
        </div>
      </div>
    );
  }

  return <GalleryItemClient item={item} />;
}
