import { createAdminClient } from "@/lib/supabase/admin";
import WikiHistoryClient from "./WikiHistoryClient";
import type { Metadata } from "next";

interface WikiRevision {
  id: string;
  article_id: string;
  content: string;
  title: string;
  edit_comment: string;
  created_at: string;
  profiles?: { display_name: string; username: string } | null;
}

interface WikiArticle {
  id: string;
  slug: string;
  title: string;
  category_id: string | null;
  wiki_categories?: { name: string; slug: string; icon: string } | null;
}

async function getArticle(slug: string): Promise<WikiArticle | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("wiki_articles")
    .select("id, slug, title, category_id, wiki_categories(name, slug, icon)")
    .eq("slug", slug)
    .single();

  if (!data) return null;

  return {
    ...data,
    wiki_categories: Array.isArray(data.wiki_categories) ? data.wiki_categories[0] : data.wiki_categories || null,
  } as WikiArticle;
}

async function getRevisions(articleId: string): Promise<WikiRevision[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("wiki_revisions")
    .select("*, profiles(display_name, username)")
    .eq("article_id", articleId)
    .order("created_at", { ascending: false });

  return (data || []).map((r: any) => ({
    ...r,
    profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles || null,
  })) as WikiRevision[];
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
    title: `Історія: ${article.title} — Кодлопедія`,
  };
}

export default async function WikiHistoryPage({
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

  const revisions = await getRevisions(article.id);
  const categorySlug = article.wiki_categories?.slug || "general";

  return (
    <WikiHistoryClient
      article={article}
      revisions={revisions}
      categorySlug={categorySlug}
    />
  );
}
