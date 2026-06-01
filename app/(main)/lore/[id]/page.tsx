import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import LoreItemClient from "./LoreItemClient";
import type { Metadata } from "next";

interface LoreItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  media_id: string | null;
  author_id: string;
  created_at: string;
  profiles?: { display_name: string; username: string; avatar_url: string | null } | null;
  media?: { id: string; file_url: string; file_type: string; file_size: number | null; caption: string | null } | null;
}

const getLoreItem = unstable_cache(
  async (id: string): Promise<LoreItem | null> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("lore_items")
      .select("*, media(*), profiles(display_name, username, avatar_url)")
      .eq("id", id)
      .single();
    if (!data) return null;
    return {
      ...data,
      profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles || null,
      media: Array.isArray(data.media) ? data.media[0] : data.media || null,
    } as unknown as LoreItem;
  },
  ["lore-item"],
  { revalidate: 60 }
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await getLoreItem(id);

  if (!item) {
    return { title: "Артефакт не знайдено" };
  }

  return {
    title: item.title,
    description: item.description || "Артефакт кодла",
  };
}

export default async function LoreItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getLoreItem(id);

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="heading-sub text-hairline-dark mb-4">:(</p>
          <p className="text-on-primary-mute">Артефакт не знайдено</p>
        </div>
      </div>
    );
  }

  return <LoreItemClient item={item} />;
}
