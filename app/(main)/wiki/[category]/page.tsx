import { createAdminClient } from "@/lib/supabase/admin";
import WikiCategoryClient from "./WikiCategoryClient";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

interface WikiCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
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
  profiles?: { display_name: string; username: string } | null;
}

async function getCategory(slug: string): Promise<WikiCategory | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("wiki_categories")
    .select("*")
    .eq("slug", slug)
    .single();
  return data as WikiCategory | null;
}

async function getCategoryArticles(categoryId: string): Promise<WikiArticle[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("wiki_articles")
    .select("*, profiles(display_name, username)")
    .eq("category_id", categoryId)
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("title", { ascending: true });
  return (data || []).map((a: any) => ({
    ...a,
    profiles: Array.isArray(a.profiles) ? a.profiles[0] : a.profiles || null,
  })) as WikiArticle[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategory(category);

  if (!cat) {
    return { title: "Категорія не знайдена" };
  }

  return {
    ...buildPageMetadata({
      title: `${cat.name} — Кодлопедія`,
      description: cat.description,
      path: `/wiki/${cat.slug}`,
    }),
  };
}

export default async function WikiCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = await getCategory(category);

  if (!cat) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="heading-sub text-hairline-dark mb-4">:(</p>
          <p className="text-on-primary-mute">Категорію не знайдено</p>
        </div>
      </div>
    );
  }

  const articles = await getCategoryArticles(cat.id);

  return (
    <WikiCategoryClient category={cat} articles={articles} />
  );
}
