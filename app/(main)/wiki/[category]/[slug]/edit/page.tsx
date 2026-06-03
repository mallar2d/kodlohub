import { createAdminClient } from "@/lib/supabase/admin";
import WikiEditorClient from "./WikiEditorClient";
import type { Metadata } from "next";

interface WikiCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface WikiArticle {
  id: string;
  slug: string;
  title: string;
  content: string;
  category_id: string | null;
  is_published: boolean;
  is_featured: boolean;
}

async function getCategories(): Promise<WikiCategory[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("wiki_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data || []) as WikiCategory[];
}

async function getArticle(slugOrId: string): Promise<WikiArticle | null> {
  const supabase = createAdminClient();
  const clean = decodeURIComponent(slugOrId).trim();

  const { data } = await supabase
    .from("wiki_articles")
    .select("*")
    .eq("slug", clean)
    .single();

  if (data) return data as WikiArticle;

  const { data: byId } = await supabase
    .from("wiki_articles")
    .select("*")
    .eq("id", clean)
    .single();

  return (byId as WikiArticle) || null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article && slug !== "new") {
    return { title: "Стаття не знайдена" };
  }

  return {
    title: article ? `Редагувати: ${article.title}` : "Нова стаття",
  };
}

export default async function WikiEditPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const categories = await getCategories();
  const article = slug === "new" ? null : await getArticle(slug);

  return (
    <WikiEditorClient
      categories={categories}
      article={article}
      initialCategory={category}
    />
  );
}
