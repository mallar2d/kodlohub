"use client";

import { useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";

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

export default function WikiCategoryClient({
  category,
  articles,
}: {
  category: WikiCategory;
  articles: WikiArticle[];
}) {
  const [search, setSearch] = useState("");

  const filtered = articles.filter(
    (a) =>
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-8">
          <Link href="/wiki" className="micro-cap text-ink-mute hover:text-on-primary transition-colors">
            КОДЛОПЕДІЯ
          </Link>
          <span className="text-ink-mute">/</span>
          <span className="micro-cap text-on-primary">
            {category.icon} {category.name}
          </span>
        </nav>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{category.icon}</span>
          </div>
          <h1 className="heading-section mb-4">{category.name.toUpperCase()}</h1>
          <p className="text-on-primary-mute text-lg max-w-2xl">
            {category.description}
          </p>
        </div>

        {/* Search and create button */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <input
            type="text"
            placeholder="ШУКАТИ В КАТЕГОРІЇ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-md px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute"
          />
          <Link
            href={`/wiki/${category.slug}/new/edit`}
            className="btn-ghost text-on-primary text-xs shrink-0"
          >
            + НОВА СТАТТЯ
          </Link>
        </div>

        {/* Articles list */}
        {filtered.length === 0 ? (
          <EmptyState message="статей у цій категорії поки немає" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((article) => (
              <Link
                key={article.id}
                href={`/wiki/${category.slug}/${article.slug}`}
                className="card-dark p-6 hover:border-on-primary-mute transition-colors group"
              >
                <div className="flex items-center gap-2 mb-3">
                  {article.is_featured && (
                    <span className="button-cap px-2 py-0.5 rounded border border-yellow-500/50 text-yellow-400 text-[10px]">
                      ★ ОБРАНА
                    </span>
                  )}
                  <span className="caption text-ink-mute">
                    {new Date(article.updated_at).toLocaleDateString("uk-UA")}
                  </span>
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
        )}
      </div>
    </div>
  );
}
