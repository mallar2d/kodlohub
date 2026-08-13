"use client";

import { useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import { wikiCategoryIcons } from "@/lib/wiki-icons";
import { stripWikiMarkup } from "../WikiClient";

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
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto space-y-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2">
          <Link href="/wiki" className="micro-cap text-ink-mute hover:text-on-primary transition-colors">
            КОДЛОПЕДІЯ
          </Link>
          <span className="text-ink-mute">/</span>
          <span className="micro-cap text-on-primary inline-flex items-center gap-1.5">
            <span className="inline-flex">{wikiCategoryIcons[category.slug] || wikiCategoryIcons.general}</span>
            <span>{category.name}</span>
          </span>
        </nav>

        {/* Hero Header */}
        <div className="card-dark p-6 sm:p-10 rounded-2xl">
          <div className="flex items-center gap-3 mb-4 text-on-primary">
            <div className="p-3 rounded-xl bg-canvas-night border border-hairline-dark">
              {wikiCategoryIcons[category.slug] || wikiCategoryIcons.general}
            </div>
            <div className="badge-status">
              <span className="pulse-dot" />
              <span className="text-on-primary font-mono text-[11px]">{articles.length} СТАТЕЙ</span>
            </div>
          </div>
          <h1 className="heading-hero !text-3xl sm:!text-5xl mb-3">{category.name.toUpperCase()}</h1>
          <p className="text-on-primary-mute text-base max-w-2xl leading-relaxed">
            {category.description}
          </p>
        </div>

        {/* Search and create button */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder={`Шукати в розділі ${category.name}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-canvas-night-soft border border-hairline-dark rounded-xl text-on-primary text-sm placeholder:text-ink-mute focus:outline-none focus:border-white/30 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink-mute hover:text-on-primary"
              >
                ✕
              </button>
            )}
          </div>
          <Link
            href={`/wiki/${category.slug}/new/edit`}
            className="btn-solid !py-2 !px-4 !text-xs shrink-0"
          >
            + СТВОРИТИ СТАТТЮ
          </Link>
        </div>

        {/* Articles list */}
        {filtered.length === 0 ? (
          <EmptyState message="У цій категорії поки немає статей" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((article) => (
              <Link
                key={article.id}
                href={`/wiki/${category.slug}/${article.slug}`}
                className="card-dark p-5 hover:border-white/25 transition-all flex items-center justify-between group rounded-xl"
              >
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-on-primary text-base group-hover:text-cyan-400 transition-colors truncate">
                      {article.title}
                    </h3>
                    {article.is_featured && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-yellow-500/50 text-yellow-400 font-mono">
                        ★ ОБРАНА
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-mute truncate max-w-md">
                    {stripWikiMarkup(article.content).slice(0, 100)}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1 text-xs text-ink-mute font-mono">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    {article.view_count}
                  </div>
                  <span className="text-ink-mute group-hover:text-on-primary transition-colors">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
