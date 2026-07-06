import { createAdminClient } from "@/lib/supabase/admin";
import WikiArticleClient from "./WikiArticleClient";
import type { Metadata } from "next";
import { buildPageMetadata, plainText } from "@/lib/seo";

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

async function getArticle(slugOrId: string): Promise<WikiArticle | null> {
  const supabase = createAdminClient();
  const clean = decodeURIComponent(slugOrId).trim();

  const { data } = await supabase
    .from("wiki_articles")
    .select("*, wiki_categories(name, slug, icon), profiles(display_name, username, avatar_url)")
    .eq("slug", clean)
    .eq("is_published", true)
    .single();

  if (data) {
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

  const { data: byId } = await supabase
    .from("wiki_articles")
    .select("*, wiki_categories(name, slug, icon), profiles(display_name, username, avatar_url)")
    .eq("id", clean)
    .single();

  if (byId) {
    await supabase
      .from("wiki_articles")
      .update({ view_count: (byId.view_count || 0) + 1 })
      .eq("id", byId.id);

    return {
      ...byId,
      wiki_categories: Array.isArray(byId.wiki_categories) ? byId.wiki_categories[0] : byId.wiki_categories || null,
      profiles: Array.isArray(byId.profiles) ? byId.profiles[0] : byId.profiles || null,
    } as WikiArticle;
  }

  return null;
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
    ...buildPageMetadata({
      title: `${article.title} — Кодлопедія`,
      description: plainText(article.content),
      path: `/wiki/${article.wiki_categories?.slug || "general"}/${article.slug}`,
      type: "article",
    }),
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
