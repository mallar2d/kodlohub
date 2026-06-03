import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import WikiClient from "./WikiClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Кодлопедія",
  description: "Вікі-енциклопедія кодла. Статті про учасників, події, артефакти та меми.",
};

interface WikiCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
}

interface WikiArticle {
  id: string;
  slug: string;
  title: string;
  content: string;
  view_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  wiki_categories?: { name: string; slug: string; icon: string } | null;
  profiles?: { display_name: string; username: string } | null;
}

const getCategories = unstable_cache(
  async (): Promise<WikiCategory[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("wiki_categories")
      .select("*")
      .order("sort_order", { ascending: true });
    return (data || []) as WikiCategory[];
  },
  ["wiki-categories"],
  { revalidate: 300 }
);

const getRecentArticles = unstable_cache(
  async (): Promise<WikiArticle[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("wiki_articles")
      .select("*, wiki_categories(name, slug, icon), profiles(display_name, username)")
      .eq("is_published", true)
      .order("updated_at", { ascending: false })
      .limit(10);
    return (data || []).map((a: any) => ({
      ...a,
      wiki_categories: Array.isArray(a.wiki_categories) ? a.wiki_categories[0] : a.wiki_categories || null,
      profiles: Array.isArray(a.profiles) ? a.profiles[0] : a.profiles || null,
    })) as WikiArticle[];
  },
  ["wiki-recent"],
  { revalidate: 60 }
);

const getFeaturedArticles = unstable_cache(
  async (): Promise<WikiArticle[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("wiki_articles")
      .select("*, wiki_categories(name, slug, icon), profiles(display_name, username)")
      .eq("is_published", true)
      .eq("is_featured", true)
      .order("view_count", { ascending: false })
      .limit(5);
    return (data || []).map((a: any) => ({
      ...a,
      wiki_categories: Array.isArray(a.wiki_categories) ? a.wiki_categories[0] : a.wiki_categories || null,
      profiles: Array.isArray(a.profiles) ? a.profiles[0] : a.profiles || null,
    })) as WikiArticle[];
  },
  ["wiki-featured"],
  { revalidate: 300 }
);

export default async function WikiPage() {
  const [categories, recentArticles, featuredArticles] = await Promise.all([
    getCategories(),
    getRecentArticles(),
    getFeaturedArticles(),
  ]);

  return (
    <WikiClient
      categories={categories}
      recentArticles={recentArticles}
      featuredArticles={featuredArticles}
    />
  );
}
