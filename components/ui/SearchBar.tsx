"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { wikiCategoryIcons } from "@/lib/wiki-icons";
import Avatar from "@/components/ui/Avatar";

interface SearchResult {
  projects?: {
    id: string;
    slug: string;
    title: string;
    short_description: string;
    status: string;
    types: string[] | null;
  }[];
  posts: { id: string; title: string }[];
  media: { id: string; caption: string | null; file_type: string }[];
  lore: { id: string; title: string; category: string }[];
  wiki: { id: string; slug: string; title: string; wiki_categories?: { name: string; slug: string; icon: string } | null }[];
  podcast?: { id: string; title: string; episode_number: number }[];
  profiles?: { id: string; username: string; display_name: string; avatar_url: string | null; role: string }[];
}

interface SearchBarProps {
  fullWidth?: boolean;
}

export default function SearchBar({ fullWidth = false }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isExpanded = fullWidth || isHovered || isFocused || query.length > 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setIsFocused(false);
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
    }, 250);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const totalResults =
    (results?.projects?.length || 0) +
    (results?.posts?.length || 0) +
    (results?.media?.length || 0) +
    (results?.lore?.length || 0) +
    (results?.wiki?.length || 0) +
    (results?.podcast?.length || 0) +
    (results?.profiles?.length || 0);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const dropdownClass =
    "absolute top-full mt-2 max-h-[70vh] overflow-y-auto bg-canvas-night-soft border border-hairline-dark rounded-xl shadow-2xl z-50 divide-y divide-hairline-dark " +
    (fullWidth
      ? "left-0 right-0 w-auto"
      : "right-0 w-[min(26rem,calc(100vw-2rem))]");

  return (
    <div
      ref={ref}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!isFocused && !query) setIsHovered(false);
      }}
      className={`relative flex items-center ${fullWidth ? "w-full" : ""}`}
    >
      <div
        onClick={() => {
          if (!isExpanded) {
            setIsFocused(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={`relative flex items-center rounded-full bg-canvas-night-soft border border-hairline-dark hover:border-white/30 transition-[width,background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
          fullWidth
            ? "w-full h-9"
            : isExpanded
            ? "w-48 sm:w-60 h-8 bg-canvas-night-soft border-white/20 shadow-md"
            : "w-8 h-8 cursor-pointer bg-canvas-night-soft/70"
        }`}
      >
        {/* Search Icon (Pinned to left, never jumps) */}
        <div className="w-8 h-8 flex items-center justify-center shrink-0 text-on-primary-mute pointer-events-none">
          <svg
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
        </div>

        {/* Smooth Expandable Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            if (results && totalResults > 0) setOpen(true);
          }}
          onBlur={() => {
            if (!query) {
              setTimeout(() => setIsFocused(false), 150);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Шукати..."
          tabIndex={isExpanded ? 0 : -1}
          className={`bg-transparent text-on-primary text-xs placeholder:text-ink-mute focus:outline-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isExpanded
              ? "w-full pr-7 opacity-100 pointer-events-auto"
              : "w-0 p-0 opacity-0 pointer-events-none"
          }`}
        />

        {/* Clear Button or Spinner */}
        {isExpanded && query ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setQuery("");
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-mute hover:text-on-primary cursor-pointer transition-opacity duration-200"
          >
            ✕
          </button>
        ) : isExpanded && loading ? (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border border-ink-mute border-t-on-primary rounded-full animate-spin" />
          </div>
        ) : null}
      </div>

      {/* Dropdown Results */}
      {open && results && (
        <div className={dropdownClass}>
          {totalResults === 0 ? (
            <div className="p-4 text-center text-xs text-ink-mute">
              Нічого не знайдено для &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {/* Projects */}
              {results.projects && results.projects.length > 0 && (
                <div className="p-2">
                  <p className="micro-cap text-ink-mute px-2 py-1 text-[10px]">
                    ПРОЄКТИ ({results.projects.length})
                  </p>
                  {results.projects.map((item) => (
                    <Link
                      key={item.id}
                      href={`/projects/${item.slug}`}
                      onClick={() => setOpen(false)}
                      className="block px-2 py-1.5 rounded-lg hover:bg-canvas-night text-xs text-on-primary transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{item.title}</span>
                        <span className="text-[10px] text-ink-mute font-mono uppercase">{item.status}</span>
                      </div>
                      <p className="text-[11px] text-ink-mute truncate">{item.short_description}</p>
                    </Link>
                  ))}
                </div>
              )}

              {/* Wiki */}
              {results.wiki && results.wiki.length > 0 && (
                <div className="p-2">
                  <p className="micro-cap text-ink-mute px-2 py-1 text-[10px]">
                    КОДЛОПЕДІЯ ({results.wiki.length})
                  </p>
                  {results.wiki.map((item) => (
                    <Link
                      key={item.id}
                      href={`/wiki/${item.wiki_categories?.slug || "general"}/${item.slug}`}
                      onClick={() => setOpen(false)}
                      className="block px-2 py-1.5 rounded-lg hover:bg-canvas-night text-xs text-on-primary transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-ink-mute">
                          {wikiCategoryIcons[item.wiki_categories?.slug || "general"] || wikiCategoryIcons.general}
                        </span>
                        <span className="font-bold truncate">{item.title}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Posts */}
              {results.posts && results.posts.length > 0 && (
                <div className="p-2">
                  <p className="micro-cap text-ink-mute px-2 py-1 text-[10px]">
                    БЛОГ ({results.posts.length})
                  </p>
                  {results.posts.map((item) => (
                    <Link
                      key={item.id}
                      href={`/blog/${item.id}`}
                      onClick={() => setOpen(false)}
                      className="block px-2 py-1.5 rounded-lg hover:bg-canvas-night text-xs text-on-primary transition-colors truncate"
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              )}

              {/* Lore */}
              {results.lore && results.lore.length > 0 && (
                <div className="p-2">
                  <p className="micro-cap text-ink-mute px-2 py-1 text-[10px]">
                    АРТЕФАКТИ ({results.lore.length})
                  </p>
                  {results.lore.map((item) => (
                    <Link
                      key={item.id}
                      href={`/lore/${item.id}`}
                      onClick={() => setOpen(false)}
                      className="block px-2 py-1.5 rounded-lg hover:bg-canvas-night text-xs text-on-primary transition-colors truncate"
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              )}

              {/* Media */}
              {results.media && results.media.length > 0 && (
                <div className="p-2">
                  <p className="micro-cap text-ink-mute px-2 py-1 text-[10px]">
                    МЕДІА ({results.media.length})
                  </p>
                  {results.media.map((item) => (
                    <Link
                      key={item.id}
                      href={`/gallery/${item.id}`}
                      onClick={() => setOpen(false)}
                      className="block px-2 py-1.5 rounded-lg hover:bg-canvas-night text-xs text-on-primary transition-colors truncate"
                    >
                      {item.caption || `Медіа (${item.file_type})`}
                    </Link>
                  ))}
                </div>
              )}

              {/* Profiles */}
              {results.profiles && results.profiles.length > 0 && (
                <div className="p-2">
                  <p className="micro-cap text-ink-mute px-2 py-1 text-[10px]">
                    УЧАСНИКИ ({results.profiles.length})
                  </p>
                  {results.profiles.map((item) => (
                    <Link
                      key={item.id}
                      href={`/profile/${item.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-canvas-night text-xs text-on-primary transition-colors"
                    >
                      <Avatar src={item.avatar_url} displayName={item.display_name} size={18} />
                      <span className="font-bold">{item.display_name}</span>
                      <span className="text-[10px] text-ink-mute font-mono">@{item.username}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
