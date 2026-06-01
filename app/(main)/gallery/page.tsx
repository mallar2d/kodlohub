import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import GalleryClient from "./GalleryClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Галерея",
  description: "Фото та відео кодла в одному місці.",
};

interface Media {
  id: string;
  file_url: string;
  file_type: string;
  caption: string | null;
  created_at: string;
  author_id: string;
  profiles?: { display_name: string; username: string; avatar_url: string | null } | null;
}

const getMedia = unstable_cache(
  async (filter: string): Promise<Media[]> => {
    const supabase = createAdminClient();
    let query = supabase
      .from("media")
      .select("id, file_url, file_type, caption, created_at, author_id, profiles(display_name, username, avatar_url)")
      .in("file_type", ["image", "video"])
      .order("created_at", { ascending: false })
      .limit(200);

    if (filter === "image") {
      query = query.eq("file_type", "image");
    } else if (filter === "video") {
      query = query.eq("file_type", "video");
    }

    const { data } = await query;
    return (data || []).map((item: any) => ({
      ...item,
      profiles: item.profiles?.[0] || null,
    })) as Media[];
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
