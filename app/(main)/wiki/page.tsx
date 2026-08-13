import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import WikiClient from "./WikiClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Кодлопедія",
  description: "Вікі-енциклопедія кодла. Статті про учасників, події, артефакти та меми.",
  path: "/wiki",
});

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

const getWikiData = unstable_cache(
  async (): Promise<{
    categories: WikiCategory[];
    articles: WikiArticle[];
    featuredArticles: WikiArticle[];
    totalViews: number;
  }> => {
    const supabase = createAdminClient();

    const [catRes, articlesRes] = await Promise.all([
      supabase
        .from("wiki_categories")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("wiki_articles")
        .select("*, wiki_categories(name, slug, icon), profiles(display_name, username)")
        .eq("is_published", true)
        .order("updated_at", { ascending: false }),
    ]);

    const categories = (catRes.data || []) as WikiCategory[];
    const articles = (articlesRes.data || []).map((a: any) => ({
      ...a,
      wiki_categories: Array.isArray(a.wiki_categories) ? a.wiki_categories[0] : a.wiki_categories || null,
      profiles: Array.isArray(a.profiles) ? a.profiles[0] : a.profiles || null,
    })) as WikiArticle[];

    const featuredArticles = articles.filter((a) => a.is_featured).slice(0, 6);
    const totalViews = articles.reduce((sum, a) => sum + (a.view_count || 0), 0);

    return {
      categories,
      articles,
      featuredArticles,
      totalViews,
    };
  },
  ["wiki-full-data-v2"],
  { revalidate: 60 }
);

export default async function WikiPage() {
  const { categories, articles, featuredArticles, totalViews } = await getWikiData();

  return (
    <WikiClient
      categories={categories}
      articles={articles}
      featuredArticles={featuredArticles}
      totalViews={totalViews}
    />
  );
}

