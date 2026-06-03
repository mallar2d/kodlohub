"use client";

import { useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import { wikiCategoryIcons } from "@/lib/wiki-icons";

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

export default function WikiClient({
  categories,
  recentArticles,
  featuredArticles,
}: {
  categories: WikiCategory[];
  recentArticles: WikiArticle[];
  featuredArticles: WikiArticle[];
}) {
  const [search, setSearch] = useState("");

  const filteredArticles = recentArticles.filter(
    (a) =>
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="micro-cap text-ink-mute mb-2">ПИШЕМО ПРО КОДЛО</p>
          <h1 className="heading-section mb-4">КОДЛОПЕДІЯ</h1>
          <p className="text-on-primary-mute text-lg max-w-2xl">
            Вікі-енциклопедія нашої спільноти. Статті про учасників, події, артефакти та внутрішні меми.
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="ШУКАТИ В КОДЛОПЕДІЇ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute"
          />
        </div>

        {/* Categories grid */}
        <div className="mb-16">
          <h2 className="micro-cap text-ink-mute mb-6">КАТЕГОРІЇ</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/wiki/${cat.slug}`}
                className="card-dark p-4 hover:border-on-primary-mute transition-colors text-center group"
              >
                <div className="text-on-primary-mute mb-2 flex justify-center">{wikiCategoryIcons[cat.slug] || wikiCategoryIcons.general}</div>
                <h3 className="button-cap text-on-primary group-hover:text-on-primary-mute transition-colors">
                  {cat.name}
                </h3>
                <p className="caption text-ink-mute mt-1 line-clamp-2">
                  {cat.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Featured articles */}
        {featuredArticles.length > 0 && (
          <div className="mb-16">
            <h2 className="micro-cap text-ink-mute mb-6">ОБРАНІ СТАТТІ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/wiki/${article.wiki_categories?.slug || "general"}/${article.slug}`}
                  className="card-dark p-6 hover:border-on-primary-mute transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="button-cap px-3 py-1 rounded-full border border-yellow-500/50 text-yellow-400 text-[10px]">
                      ★ ОБРАНА
                    </span>
                    {article.wiki_categories && (
                      <span className="button-cap px-2 py-0.5 rounded border border-hairline-dark text-ink-mute text-[10px] flex items-center gap-1">
                        <span className="inline-flex">{wikiCategoryIcons[article.wiki_categories.slug] || wikiCategoryIcons.general}</span>
                        {article.wiki_categories.name}
                      </span>
                    )}
                  </div>
                  <h3 className="heading-sub text-on-primary mb-3 group-hover:text-on-primary-mute transition-colors line-clamp-2 text-xl">
                    {article.title}
                  </h3>
                  <p className="text-on-primary-mute text-sm line-clamp-3 mb-4">
                    {article.content.slice(0, 200)}
                    {article.content.length > 200 ? "..." : ""}
                  </p>
                  <div className="flex items-center justify-between">
                    {article.profiles && (
                      <p className="caption text-ink-mute">
                        {article.profiles.display_name}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-ink-mute">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      {article.view_count}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent articles */}
        <div>
          <h2 className="micro-cap text-ink-mute mb-6">ОСТАННІ ЗМІНИ</h2>
          {filteredArticles.length === 0 ? (
            <EmptyState message="статей поки немає" />
          ) : (
            <div className="space-y-3">
              {filteredArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/wiki/${article.wiki_categories?.slug || "general"}/${article.slug}`}
                  className="card-dark p-4 hover:border-on-primary-mute transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {article.wiki_categories && (
                      <span className="button-cap px-2 py-0.5 rounded border border-hairline-dark text-ink-mute text-[10px] shrink-0 inline-flex">
                        {wikiCategoryIcons[article.wiki_categories.slug] || wikiCategoryIcons.general}
                      </span>
                    )}
                    <div className="min-w-0">
                      <h3 className="button-cap text-on-primary group-hover:text-on-primary-mute transition-colors truncate">
                        {article.title}
                      </h3>
                      <p className="caption text-ink-mute truncate">
                        {article.content.slice(0, 100)}
                        {article.content.length > 100 ? "..." : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <span className="caption text-ink-mute hidden sm:block">
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
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
