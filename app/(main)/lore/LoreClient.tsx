"use client";

import { useState } from "react";
import Link from "next/link";

interface LoreItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  media_id: string | null;
  file_url: string | null;
  author_id: string;
  created_at: string;
  profiles?: { display_name: string; avatar_url: string | null } | null;
}

const categories = [
  { key: "all", label: "ВСЕ" },
  { key: "person", label: "ЛЮДИ" },
  { key: "event", label: "ПОДІЇ" },
  { key: "artifact", label: "АРТЕФАКТИ" },
  { key: "meme", label: "МЕМИ" },
  { key: "quote", label: "ЦИТАТИ" },
];

const categoryColors: Record<string, string> = {
  person: "border-blue-500/50 text-blue-400",
  event: "border-green-500/50 text-green-400",
  artifact: "border-yellow-500/50 text-yellow-400",
  meme: "border-purple-500/50 text-purple-400",
  quote: "border-pink-500/50 text-pink-400",
};

export default function LoreClient({
  initialItems,
}: {
  initialItems: LoreItem[];
}) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = initialItems.filter((item) => {
    const matchesCategory = filter === "all" || item.category === filter;
    const matchesSearch =
      !search ||
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="micro-cap text-ink-mute mb-2">АРХІВ КОДЛА</p>
          <h1 className="heading-section mb-4">АРТЕФАКТ-БІБЛІОТЕКА</h1>
          <p className="text-on-primary-mute text-lg max-w-2xl">
            Все найкраще, що створило кодло. Від мемів до фільмів. Від ботів до
            ігор.
          </p>
        </div>

        {/* Search and filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="ШУКАТИ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-md px-4 py-3 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute"
          />
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setFilter(cat.key)}
                className={`button-cap px-3 py-1.5 rounded-full border transition-opacity ${
                  filter === cat.key
                    ? "border-on-primary text-on-primary"
                    : "border-hairline-dark text-ink-mute hover:text-on-primary"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="heading-sub text-hairline-dark mb-4">:(</p>
            <p className="text-on-primary-mute">
              брєдік в чат нє пішем — тут поки нічого
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <Link
                key={item.id}
                href={`/lore/${item.id}`}
                className="card-dark p-6 hover:border-on-primary-mute transition-colors group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`button-cap px-2 py-0.5 rounded border text-[10px] ${categoryColors[item.category] || "border-hairline-dark text-ink-mute"}`}
                  >
                    {categories.find((c) => c.key === item.category)?.label ||
                      item.category.toUpperCase()}
                  </span>
                  <span className="caption text-ink-mute">
                    {new Date(item.created_at).toLocaleDateString("uk-UA")}
                  </span>
                </div>
                <h3 className="font-bold text-on-primary mb-2 group-hover:text-on-primary-mute transition-colors line-clamp-2">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-on-primary-mute text-sm line-clamp-3 mb-3">
                    {item.description.slice(0, 150)}
                    {item.description.length > 150 ? "..." : ""}
                  </p>
                )}
                {item.profiles && (
                  <p className="caption text-ink-mute">
                    {item.profiles.display_name}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
