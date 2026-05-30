import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import LoreClient from "./LoreClient";

interface LoreItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  media_id: string | null;
  file_url: string | null;
  author_id: string;
  created_at: string;
  like_count?: number;
  profiles?: { display_name: string; avatar_url: string | null } | null;
}

const getLoreItems = unstable_cache(
  async (): Promise<LoreItem[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("lore_items")
      .select("*, profiles(display_name, avatar_url), likes:likes(id)")
      .order("created_at", { ascending: false });

    const itemsWithLikes = (data || []).map((item: any) => ({
      ...item,
      like_count: item.likes?.length || 0,
      profiles: item.profiles?.[0] || null,
    }));

    itemsWithLikes.sort((a: LoreItem, b: LoreItem) => (b.like_count || 0) - (a.like_count || 0));

    return itemsWithLikes as LoreItem[];
  },
  ["lore-items"],
  { revalidate: 60 }
);

export default async function LorePage() {
  const items = await getLoreItems();
  return <LoreClient initialItems={items} />;
}
