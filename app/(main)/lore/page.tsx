import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import LoreClient from "./LoreClient";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

const categoryMetadata: Record<string, { title: string; description: string }> = {
  all: { title: "Артефакти", description: "Архів артефактів та мемів кодла." },
  person: { title: "Люди — Артефакти", description: "Люди кодла в архіві KodloHUB." },
  event: { title: "Події — Артефакти", description: "Події та історії кодла в архіві KodloHUB." },
  artifact: { title: "Артефакти — Архів", description: "Предмети, знахідки та артефакти кодла." },
  meme: { title: "Меми — Артефакти", description: "Меми кодла в архіві KodloHUB." },
  quote: { title: "Цитати — Артефакти", description: "Цитати та фрази кодла в архіві KodloHUB." },
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}): Promise<Metadata> {
  const { category = "all" } = await searchParams;
  const current = categoryMetadata[category] || categoryMetadata.all;

  return buildPageMetadata({
    ...current,
    path: category === "all" ? "/lore" : `/lore?category=${category}`,
  });
}

interface LoreItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  media_id: string | null;
  file_url: string | null;
  author_id: string;
  created_at: string;
  profiles?: { display_name: string; avatar_url: string | null } | null;
}

const getLoreItems = unstable_cache(
  async (): Promise<LoreItem[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("lore_items")
      .select("*, profiles(display_name, avatar_url)")
      .order("created_at", { ascending: false });
    return (data || []).map((item: any) => ({
      ...item,
      profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles || null
    })) as LoreItem[];
  },
  ["lore-items"],
  { revalidate: 60 }
);

export default async function LorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const initialCategory = params.category || "all";
  const items = await getLoreItems();
  return <LoreClient initialItems={items} initialCategory={initialCategory} />;
}
