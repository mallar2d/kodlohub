import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import GalleryClient from "./GalleryClient";

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

const getMedia = unstable_cache(
  async (filter: string): Promise<Media[]> => {
    const supabase = createAdminClient();
    let query = supabase
      .from("media")
      .select(`
        id, file_url, file_type, caption, created_at, author_id,
        profiles(display_name, username, avatar_url),
        likes:likes(id)
      `)
      .in("file_type", ["image", "video"])
      .limit(50);

    if (filter === "image") {
      query = query.eq("file_type", "image");
    } else if (filter === "video") {
      query = query.eq("file_type", "video");
    }

    const { data } = await query;

    const mediaWithLikes = (data || []).map((item: any) => ({
      ...item,
      like_count: item.likes?.length || 0,
      profiles: item.profiles?.[0] || null,
    }));

    mediaWithLikes.sort((a: Media, b: Media) => (b.like_count || 0) - (a.like_count || 0));

    return mediaWithLikes as Media[];
  },
  ["gallery-media"],
  { revalidate: 30 }
);

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter || "all";
  const media = await getMedia(filter);

  return <GalleryClient initialMedia={media} initialFilter={filter} />;
}
