"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { wikiCategoryIcons } from "@/lib/wiki-icons";

export function stripWikiMarkup(text: string): string {
  if (!text) return "";
  let result = text;
  // Strip MediaWiki templates {{...}}
  result = result.replace(/\{\{[\s\S]*?\}\}/g, "");
  // Strip headings = ... = and # ...
  result = result.replace(/^=+\s*[\s\S]*?\s*=+$/gm, "");
  result = result.replace(/^#+\s+/gm, "");
  // Strip bold & italics syntax: ''', '', ***, **, *
  result = result.replace(/'''([\s\S]*?)'''/g, "$1");
  result = result.replace(/''([\s\S]*?)''/g, "$1");
  result = result.replace(/\*\*\*([\s\S]*?)\*\*\*/g, "$1");
  result = result.replace(/\*\*([\s\S]*?)\*\*/g, "$1");
  result = result.replace(/\*([\s\S]*?)\*/g, "$1");
  result = result.replace(/___([\s\S]*?)___/g, "$1");
  result = result.replace(/__([\s\S]*?)__/g, "$1");
  result = result.replace(/_([\s\S]*?)_/g, "$1");
  // Strip image embeddings and links
  result = result.replace(/\[\[(?:Файл|File):[^\]]*\]\]/gi, "");
  result = result.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  result = result.replace(/\[\[([^\]|]*\|)?([^\]]+)\]\]/g, "$2");
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  result = result.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, "$2");
  // Strip definition list markers and blockquotes
  result = result.replace(/^;\s*/gm, "");
  result = result.replace(/^:\s*/gm, "");
  result = result.replace(/^>\s*/gm, "");
  result = result.replace(/^\*\s+/gm, "");
  result = result.replace(/^-\s+/gm, "");
  // Clean whitespace
  return result.replace(/\s+/g, " ").trim();
}

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
  articles,
  featuredArticles,
  totalViews = 0,
}: {
  categories: WikiCategory[];
  articles: WikiArticle[];
  featuredArticles: WikiArticle[];
  totalViews?: number;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const getCategoryCount = (slug: string) => {
    return articles.filter((a) => a.wiki_categories?.slug === slug).length;
  };

  // Only show categories that have at least 1 article, or all if none
  const activeCategories = useMemo(() => {
    const list = categories.filter((cat) => getCategoryCount(cat.slug) > 0);
    return list.length > 0 ? list : categories;
  }, [categories, articles]);

  const filteredArticles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter((a) => {
      const matchesCategory =
        selectedCategory === "all" ||
        a.wiki_categories?.slug === selectedCategory;
      const matchesSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.wiki_categories?.name.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [articles, search, selectedCategory]);

  const handleRandomArticle = () => {
    if (articles.length === 0) return;
    const random = articles[Math.floor(Math.random() * articles.length)];
    const catSlug = random.wiki_categories?.slug || "general";
    router.push(`/wiki/${catSlug}/${random.slug}`);
  };

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto space-y-10">
        {/* Top Hero Header */}
        <div className="card-dark p-6 sm:p-10 rounded-2xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="badge-status">
                <span className="pulse-dot" />
                <span className="text-on-primary font-mono text-[11px]">KODLOPEDIA</span>
              </div>
              <span className="micro-cap text-ink-mute text-[11px]">ВІДКРИТА ЕНЦИКЛОПЕДІЯ</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRandomArticle}
                className="button-cap px-3.5 py-1.5 rounded-full border border-hairline-dark text-xs text-on-primary hover:border-white/40 hover:bg-white/[0.05] transition-all flex items-center gap-2 cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 3 21 3 21 8" />
                  <line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                </svg>
                ВИПАДКОВА СТАТТЯ
              </button>
              <Link
                href="/upload"
                className="btn-solid !py-1.5 !px-3.5 !text-xs"
              >
                + СТВОРИТИ
              </Link>
            </div>
          </div>

          <h1 className="heading-hero !text-3xl sm:!text-5xl mb-3">
            КОДЛО<span className="text-on-primary-mute">ПЕДІЯ</span>
          </h1>

          <p className="text-on-primary-mute text-sm sm:text-base max-w-2xl leading-relaxed mb-6">
            Централізована база знань: біографії, хроніки подій, артефакти, терміни та внутрішній культурний код спільноти.
          </p>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-hairline-dark">
            {[
              { label: "СТАТЕЙ У БАЗІ", value: articles.length },
              { label: "АКТИВНИХ РОЗДІЛІВ", value: activeCategories.length },
              { label: "ПЕРЕГЛЯДІВ", value: totalViews },
              { label: "СТАТУС БАЗИ", value: "АВТОНОМНА" },
            ].map((stat) => (
              <div key={stat.label} className="p-3 rounded-xl bg-canvas-night border border-hairline-dark/60">
                <p className="heading-sub !text-lg text-on-primary font-mono">{stat.value}</p>
                <p className="micro-cap text-ink-mute mt-0.5 text-[10px]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Search Bar & Active Category Filter */}
        <div className="space-y-4">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute"
              width="16"
              height="16"
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
              placeholder="Пошук у Кодлопедії..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-3 bg-canvas-night-soft border border-hairline-dark rounded-xl text-on-primary text-sm placeholder:text-ink-mute focus:outline-none focus:border-white/30 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-mute hover:text-on-primary cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Clean Category Filter (Only active categories with articles) */}
          {activeCategories.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`button-cap px-3.5 py-1.5 rounded-full text-xs transition-colors shrink-0 cursor-pointer ${
                  selectedCategory === "all"
                    ? "bg-on-primary text-ink font-bold"
                    : "border border-hairline-dark text-on-primary-mute hover:text-on-primary hover:bg-canvas-night-soft"
                }`}
              >
                ВСІ ({articles.length})
              </button>
              {activeCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`button-cap px-3.5 py-1.5 rounded-full text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    selectedCategory === cat.slug
                      ? "bg-on-primary text-ink font-bold"
                      : "border border-hairline-dark text-on-primary-mute hover:text-on-primary hover:bg-canvas-night-soft"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="text-[10px] opacity-70 font-mono">({getCategoryCount(cat.slug)})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Featured Articles (if any) */}
        {selectedCategory === "all" && !search && featuredArticles.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="micro-cap text-ink-mute">ОБРАНІ МАТЕРІАЛИ</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/wiki/${article.wiki_categories?.slug || "general"}/${article.slug}`}
                  className="card-dark p-5 hover:border-white/25 transition-all group rounded-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="button-cap px-2 py-0.5 rounded-full border border-yellow-500/50 bg-yellow-500/10 text-yellow-400 text-[10px] font-mono">
                        ★ ОБРАНА
                      </span>
                      {article.wiki_categories && (
                        <span className="micro-cap text-[10px] text-ink-mute font-mono">
                          {article.wiki_categories.name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold uppercase tracking-wide text-on-primary mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-on-primary-mute text-xs line-clamp-3 leading-relaxed mb-4">
                      {stripWikiMarkup(article.content).slice(0, 140)}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-hairline-dark flex items-center justify-between text-xs text-ink-mute">
                    <span>{article.profiles?.display_name || "Кодлопедія"}</span>
                    <span className="flex items-center gap-1 font-mono">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      {article.view_count}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All Articles Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="micro-cap text-ink-mute">
              {search ? `РЕЗУЛЬТАТИ ПОШУКУ (${filteredArticles.length})` : "ВСІ СТАТТІ"}
            </p>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="text-center py-16 border border-hairline-dark rounded-xl bg-canvas-night-soft/40">
              <p className="text-base font-bold text-on-primary mb-1">Статей не знайдено</p>
              <p className="text-xs text-ink-mute">Спробуйте змінити пошуковий запит або скинути фільтри.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/wiki/${article.wiki_categories?.slug || "general"}/${article.slug}`}
                  className="card-dark p-4 sm:p-5 hover:border-white/25 transition-colors flex items-center justify-between group rounded-xl"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-xl bg-canvas-night border border-hairline-dark text-on-primary shrink-0 group-hover:border-white/30 transition-colors">
                      {wikiCategoryIcons[article.wiki_categories?.slug || "general"] || wikiCategoryIcons.general}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-on-primary text-base group-hover:text-cyan-400 transition-colors truncate">
                        {article.title}
                      </h3>
                      <p className="text-xs text-ink-mute truncate max-w-md mt-0.5">
                        {article.wiki_categories?.name || "Кодлопедія"} · {stripWikiMarkup(article.content).slice(0, 90)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pl-3">
                    <span className="text-xs font-mono text-ink-mute flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      {article.view_count}
                    </span>
                    <span className="text-ink-mute group-hover:text-on-primary transition-colors text-sm">→</span>
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
