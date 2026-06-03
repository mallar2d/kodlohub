import { createAdminClient } from "@/lib/supabase/admin";
import WikiArticleClient from "./WikiArticleClient";
import type { Metadata } from "next";

interface WikiArticle {
  id: string;
  slug: string;
  title: string;
  content: string;
  view_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  category_id: string | null;
  author_id: string | null;
  wiki_categories?: { name: string; slug: string; icon: string } | null;
  profiles?: { display_name: string; username: string; avatar_url: string | null } | null;
}

async function getArticle(slug: string): Promise<WikiArticle | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("wiki_articles")
    .select("*, wiki_categories(name, slug, icon), profiles(display_name, username, avatar_url)")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!data) return null;

  await supabase
    .from("wiki_articles")
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq("id", data.id);

  return {
    ...data,
    wiki_categories: Array.isArray(data.wiki_categories) ? data.wiki_categories[0] : data.wiki_categories || null,
    profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles || null,
  } as WikiArticle;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return { title: "Стаття не знайдена" };
  }

  return {
    title: `${article.title} — Кодлопедія`,
    description: article.content.slice(0, 150),
  };
}

export default async function WikiArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="heading-sub text-hairline-dark mb-4">:(</p>
          <p className="text-on-primary-mute">Статтю не знайдено</p>
        </div>
      </div>
    );
  }

  return <WikiArticleClient article={article} />;
}
