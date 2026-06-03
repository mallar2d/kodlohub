"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { wikiCategoryIcons } from "@/lib/wiki-icons";

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

export default function WikiArticleClient({ article }: { article: WikiArticle }) {
  const router = useRouter();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const cachedRole = localStorage.getItem("userRole");
    if (cachedRole) {
      setUserRole(cachedRole);
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        setUserRole(profile?.role || null);
      }
    });
  }, []);

  const isAdmin = userRole === "owner" || userRole === "podrofikovany";
  const categorySlug = article.wiki_categories?.slug || "general";

  const handleDelete = async () => {
    if (!confirm("Ви впевнені, що хочете видалити цю статтю?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/wiki/articles/${article.slug}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast("Статтю видалено", "success");
      router.push(`/wiki/${categorySlug}`);
    } catch {
      toast("Помилка при видаленні", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-8">
          <Link href="/wiki" className="micro-cap text-ink-mute hover:text-on-primary transition-colors">
            КОДЛОПЕДІЯ
          </Link>
          <span className="text-ink-mute">/</span>
          <Link
            href={`/wiki/${categorySlug}`}
            className="micro-cap text-ink-mute hover:text-on-primary transition-colors"
          >
            {article.wiki_categories?.icon} {article.wiki_categories?.name}
          </Link>
          <span className="text-ink-mute">/</span>
          <span className="micro-cap text-on-primary truncate">{article.title}</span>
        </nav>

        {/* Article header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="heading-sub mb-4">{article.title}</h1>
              <div className="flex items-center gap-4 flex-wrap">
                {article.wiki_categories && (
                  <Link
                    href={`/wiki/${categorySlug}`}
                    className="button-cap px-3 py-1 rounded-full border border-hairline-dark text-ink-mute text-[10px] hover:text-on-primary transition-colors inline-flex items-center gap-1"
                  >
                    <span className="inline-flex">{wikiCategoryIcons[categorySlug] || wikiCategoryIcons.general}</span>
                    {article.wiki_categories.name}
                  </Link>
                )}
                {article.profiles && (
                  <span className="caption text-ink-mute">
                    {article.profiles.display_name}
                  </span>
                )}
                <span className="caption text-ink-mute">
                  {new Date(article.updated_at).toLocaleDateString("uk-UA")}
                </span>
                <div className="flex items-center gap-1 text-xs text-ink-mute">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {article.view_count}
                </div>
              </div>
            </div>

            {/* Admin actions */}
            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/wiki/${categorySlug}/${article.slug}/edit`}
                  className="btn-ghost text-on-primary text-xs"
                >
                  РЕДАГУВАТИ
                </Link>
                <Link
                  href={`/wiki/${categorySlug}/${article.slug}/history`}
                  className="btn-ghost text-on-primary text-xs"
                >
                  ІСТОРІЯ
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn-ghost text-red-400 text-xs"
                >
                  {deleting ? "ВИДАЛЕННЯ..." : "ВИДАЛИТИ"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-hairline-dark mb-8" />

        {/* Article content */}
        <article className="prose max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {article.content}
          </ReactMarkdown>
        </article>

        {/* Footer */}
        <div className="border-t border-hairline-dark mt-12 pt-6">
          <div className="flex items-center justify-between">
            <Link
              href={`/wiki/${categorySlug}`}
              className="micro-cap text-ink-mute hover:text-on-primary transition-colors"
            >
              ← НАЗАД ДО {article.wiki_categories?.name?.toUpperCase() || "КАТЕГОРІЇ"}
            </Link>
            {!isAdmin && (
              <Link
                href={`/wiki/${categorySlug}/${article.slug}/history`}
                className="micro-cap text-ink-mute hover:text-on-primary transition-colors"
              >
                ІСТОРІЯ ЗМІН
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
