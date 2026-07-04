"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { wikiCategoryIcons } from "@/lib/wiki-icons";

interface SearchResult {
  posts: { id: string; title: string }[];
  media: { id: string; caption: string | null; file_type: string }[];
  lore: { id: string; title: string; category: string }[];
  wiki: { id: string; slug: string; title: string; wiki_categories?: { name: string; slug: string; icon: string } | null }[];
}

interface SearchBarProps {
  fullWidth?: boolean;
}

export default function SearchBar({ fullWidth = false }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (query.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          setResults(data.results);
          setOpen(true);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const totalResults =
    (results?.posts.length || 0) +
    (results?.media.length || 0) +
    (results?.lore.length || 0) +
    (results?.wiki.length || 0);

  const dropdownClass =
    "absolute top-full mt-2 max-h-96 overflow-auto bg-canvas-night-soft border border-hairline-dark rounded-lg shadow-xl z-50 " +
    (fullWidth
      ? "left-0 right-0 w-auto"
      : "right-0 w-[min(20rem,calc(100vw-2rem))]");

  return (
    <div ref={ref} className={`relative ${fullWidth ? "w-full" : ""}`}>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute"
          width="14"
          height="14"
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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results && setOpen(true)}
          placeholder="ШУКАТИ..."
          className={`${fullWidth ? "w-full" : "w-40 sm:w-56"} pl-9 pr-3 py-1.5 bg-canvas-night-soft border border-hairline-dark rounded-full text-on-primary text-xs placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute transition-colors`}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin w-3 h-3 border border-on-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {open && results && totalResults > 0 && (
        <div className={dropdownClass}>
          {results.posts.length > 0 && (
            <div className="p-2">
              <p className="micro-cap text-ink-mute px-2 py-1">БЛОГ</p>
              {results.posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.id}`}
                  className="block px-3 py-2 text-sm text-on-primary hover:bg-canvas-night rounded transition-colors truncate"
                  onClick={() => { setOpen(false); setQuery(""); }}
                >
                  {post.title}
                </Link>
              ))}
            </div>
          )}
          {results.media.length > 0 && (
            <div className="p-2 border-t border-hairline-dark">
              <p className="micro-cap text-ink-mute px-2 py-1">МЕДІА</p>
              {results.media.map((item) => (
                <Link
                  key={item.id}
                  href={`/gallery/${item.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-on-primary hover:bg-canvas-night rounded transition-colors truncate"
                  onClick={() => { setOpen(false); setQuery(""); }}
                >
                  {item.file_type === "image" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-mute">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-mute">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                  )}
                  <span className="truncate">{item.caption || "Без назви"}</span>
                </Link>
              ))}
            </div>
          )}
          {results.lore.length > 0 && (
            <div className="p-2 border-t border-hairline-dark">
              <p className="micro-cap text-ink-mute px-2 py-1">АРТЕФАКТИ</p>
              {results.lore.map((item) => (
                <Link
                  key={item.id}
                  href={`/lore/${item.id}`}
                  className="block px-3 py-2 text-sm text-on-primary hover:bg-canvas-night rounded transition-colors truncate"
                  onClick={() => { setOpen(false); setQuery(""); }}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          )}
          {results.wiki && results.wiki.length > 0 && (
            <div className="p-2 border-t border-hairline-dark">
              <p className="micro-cap text-ink-mute px-2 py-1">КОДЛОПЕДІЯ</p>
              {results.wiki.map((item) => (
                <Link
                  key={item.id}
                  href={`/wiki/${item.wiki_categories?.slug || "general"}/${item.slug}`}
                  className="block px-3 py-2 text-sm text-on-primary hover:bg-canvas-night rounded transition-colors truncate"
                  onClick={() => { setOpen(false); setQuery(""); }}
                >
                  <span className="inline-flex align-middle mr-1">{wikiCategoryIcons[item.wiki_categories?.slug || "general"] || wikiCategoryIcons.general}</span>
                  {item.title}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {open && results && totalResults === 0 && !loading && (
        <div className={`${dropdownClass} p-4 text-center`}>
          <p className="text-sm text-ink-mute">Нічого не знайдено</p>
        </div>
      )}
    </div>
  );
}
